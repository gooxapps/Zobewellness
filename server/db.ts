import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { Pool, PoolClient } from 'pg';

export interface DbClient {
  get<T = any>(sql: string, params?: any[]): Promise<T | undefined>;
  all<T = any>(sql: string, params?: any[]): Promise<T[]>;
  run(sql: string, params?: any[]): Promise<{ changes: number }>;
  insert(sql: string, params?: any[]): Promise<number>;
}

const PG_CONNECTION_STRING =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  '';

export const isPostgres = Boolean(PG_CONNECTION_STRING);

let pgPool: Pool | null = null;
let sqliteDb: any = null;
let initPromise: Promise<void> | null = null;

export function nowSqlTimestamp(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

export function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function toPgPlaceholders(sql: string): string {
  let index = 0;
  let inSingleQuote = false;
  let out = '';
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") {
      if (inSingleQuote && sql[i + 1] === "'") {
        out += "''";
        i++;
        continue;
      }
      inSingleQuote = !inSingleQuote;
      out += ch;
    } else if (ch === '?' && !inSingleQuote) {
      index++;
      out += `$${index}`;
    } else {
      out += ch;
    }
  }
  return out;
}

function makePgClient(executor: Pool | PoolClient): DbClient {
  return {
    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      const res = await executor.query(toPgPlaceholders(sql), params);
      return res.rows[0] as T | undefined;
    },
    async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      const res = await executor.query(toPgPlaceholders(sql), params);
      return res.rows as T[];
    },
    async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
      const res = await executor.query(toPgPlaceholders(sql), params);
      return { changes: res.rowCount ?? 0 };
    },
    async insert(sql: string, params: any[] = []): Promise<number> {
      const hasReturning = /\bRETURNING\b/i.test(sql);
      const finalSql = hasReturning ? sql : `${sql.trim().replace(/;$/, '')} RETURNING id`;
      const res = await executor.query(toPgPlaceholders(finalSql), params);
      return Number(res.rows[0]?.id ?? 0);
    },
  };
}

function makeSqliteClient(instance: any): DbClient {
  return {
    async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
      return instance.prepare(sql).get(...params) as T | undefined;
    },
    async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
      return instance.prepare(sql).all(...params) as T[];
    },
    async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
      const info = instance.prepare(sql).run(...params);
      return { changes: info.changes ?? 0 };
    },
    async insert(sql: string, params: any[] = []): Promise<number> {
      const info = instance.prepare(sql).run(...params);
      return Number(info.lastInsertRowid ?? 0);
    },
  };
}

let rootClient: DbClient | null = null;

function resolveSqlitePath(): string {
  const isVercel = process.env.VERCEL === '1' || process.env.NOW_REGION !== undefined;
  if (isVercel) {
    return path.join('/tmp', 'zobowellness.db');
  }
  const dataDir = path.resolve(process.cwd(), 'data');
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.accessSync(dataDir, fs.constants.W_OK);
    return path.join(dataDir, 'zobowellness.db');
  } catch {
    return path.join('/tmp', 'zobowellness.db');
  }
}

async function getRootClient(): Promise<DbClient> {
  if (rootClient) return rootClient;

  if (isPostgres) {
    pgPool = new Pool({
      connectionString: PG_CONNECTION_STRING,
      ssl:
        PG_CONNECTION_STRING.includes('localhost') || PG_CONNECTION_STRING.includes('127.0.0.1')
          ? false
          : { rejectUnauthorized: false },
      max: 5,
    });
    rootClient = makePgClient(pgPool);
    return rootClient;
  }

  const { default: Database } = await import('better-sqlite3');
  const dbPath = resolveSqlitePath();
  sqliteDb = new Database(dbPath);
  sqliteDb.pragma('journal_mode = WAL');
  sqliteDb.pragma('foreign_keys = ON');
  rootClient = makeSqliteClient(sqliteDb);
  return rootClient;
}

export const db: DbClient = {
  async get<T = any>(sql: string, params: any[] = []): Promise<T | undefined> {
    const client = await getRootClient();
    return client.get<T>(sql, params);
  },
  async all<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const client = await getRootClient();
    return client.all<T>(sql, params);
  },
  async run(sql: string, params: any[] = []): Promise<{ changes: number }> {
    const client = await getRootClient();
    return client.run(sql, params);
  },
  async insert(sql: string, params: any[] = []): Promise<number> {
    const client = await getRootClient();
    return client.insert(sql, params);
  },
};

export async function dbTransaction<T>(fn: (tx: DbClient) => Promise<T>): Promise<T> {
  await getRootClient();
  if (isPostgres && pgPool) {
    const conn = await pgPool.connect();
    try {
      await conn.query('BEGIN');
      const result = await fn(makePgClient(conn));
      await conn.query('COMMIT');
      return result;
    } catch (err) {
      await conn.query('ROLLBACK');
      throw err;
    } finally {
      conn.release();
    }
  }

  if (sqliteDb) {
    sqliteDb.exec('BEGIN');
    try {
      const result = await fn(makeSqliteClient(sqliteDb));
      sqliteDb.exec('COMMIT');
      return result;
    } catch (err) {
      sqliteDb.exec('ROLLBACK');
      throw err;
    }
  }

  return fn(db);
}

function getSchemaStatements(): string[] {
  const PK = isPostgres ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  const REAL_TYPE = isPostgres ? 'DOUBLE PRECISION' : 'REAL';
  const NOW_DEFAULT = isPostgres
    ? "(to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS'))"
    : "(datetime('now'))";

  return [
    `CREATE TABLE IF NOT EXISTS admin_users (
      id ${PK},
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL DEFAULT 'Zobowellness Administrator',
      role TEXT NOT NULL DEFAULT 'owner',
      last_login_at TEXT,
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS categories (
      id ${PK},
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS products (
      id ${PK},
      category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      short_description TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      sku TEXT NOT NULL DEFAULT '',
      stock_quantity INTEGER NOT NULL DEFAULT 100,
      is_available INTEGER NOT NULL DEFAULT 1,
      is_featured INTEGER NOT NULL DEFAULT 0,
      is_visible INTEGER NOT NULL DEFAULT 1,
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      image_alt TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS product_variants (
      id ${PK},
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      packaging_size TEXT NOT NULL,
      weight_grams INTEGER NOT NULL DEFAULT 0,
      price ${REAL_TYPE},
      promo_price ${REAL_TYPE},
      stock_quantity INTEGER NOT NULL DEFAULT 100,
      is_available INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS product_images (
      id ${PK},
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      alt_text TEXT NOT NULL DEFAULT '',
      is_primary INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_zones (
      id ${PK},
      name TEXT NOT NULL,
      region_code TEXT NOT NULL DEFAULT '',
      fee ${REAL_TYPE},
      free_threshold ${REAL_TYPE},
      estimated_time TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS delivery_settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      policy_text TEXT NOT NULL DEFAULT '',
      temporary_notice TEXT NOT NULL DEFAULT '',
      is_delivery_available INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS order_enquiries (
      id ${PK},
      order_number TEXT NOT NULL UNIQUE,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      customer_email TEXT NOT NULL DEFAULT '',
      delivery_zone_id INTEGER REFERENCES delivery_zones(id) ON DELETE SET NULL,
      delivery_destination TEXT NOT NULL,
      delivery_address TEXT NOT NULL,
      notes TEXT NOT NULL DEFAULT '',
      subtotal ${REAL_TYPE} NOT NULL DEFAULT 0,
      delivery_fee ${REAL_TYPE},
      delivery_fee_pending INTEGER NOT NULL DEFAULT 1,
      has_unpriced_items INTEGER NOT NULL DEFAULT 0,
      estimated_total ${REAL_TYPE} NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'CAD',
      status TEXT NOT NULL DEFAULT 'New enquiry',
      whatsapp_message TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS order_items (
      id ${PK},
      order_id INTEGER NOT NULL REFERENCES order_enquiries(id) ON DELETE CASCADE,
      product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
      variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      packaging_size TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price ${REAL_TYPE},
      subtotal ${REAL_TYPE}
    )`,
    `CREATE TABLE IF NOT EXISTS bulk_quotations (
      id ${PK},
      reference_code TEXT NOT NULL UNIQUE,
      company_name TEXT NOT NULL,
      location TEXT NOT NULL,
      quantity_required TEXT NOT NULL,
      phone_contact TEXT NOT NULL,
      email TEXT NOT NULL DEFAULT '',
      product_interest TEXT NOT NULL DEFAULT 'Grade A Hibiscus Leaves',
      notes TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'New',
      internal_notes TEXT NOT NULL DEFAULT '',
      email_sent INTEGER NOT NULL DEFAULT 0,
      email_log TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT},
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS testimonials (
      id ${PK},
      image_url TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      alt_text TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS homepage_sections (
      id ${PK},
      section_key TEXT NOT NULL UNIQUE,
      label TEXT NOT NULL,
      title TEXT NOT NULL DEFAULT '',
      subtitle TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      cta_primary_label TEXT NOT NULL DEFAULT '',
      cta_secondary_label TEXT NOT NULL DEFAULT '',
      image_url TEXT NOT NULL DEFAULT '',
      secondary_image_url TEXT NOT NULL DEFAULT '',
      extra_json TEXT NOT NULL DEFAULT '{}',
      is_enabled INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS website_pages (
      id ${PK},
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      hero_title TEXT NOT NULL DEFAULT '',
      hero_subtitle TEXT NOT NULL DEFAULT '',
      body TEXT NOT NULL DEFAULT '',
      extra_json TEXT NOT NULL DEFAULT '{}',
      image_url TEXT NOT NULL DEFAULT '',
      seo_title TEXT NOT NULL DEFAULT '',
      seo_description TEXT NOT NULL DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS navigation_items (
      id ${PK},
      label TEXT NOT NULL,
      href TEXT NOT NULL,
      location TEXT NOT NULL DEFAULT 'header',
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS global_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS media_assets (
      id ${PK},
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
      size_bytes INTEGER NOT NULL DEFAULT 0,
      category TEXT NOT NULL DEFAULT 'general',
      alt_text TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS contact_messages (
      id ${PK},
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      subject TEXT NOT NULL DEFAULT '',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Unread',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id ${PK},
      admin_id INTEGER REFERENCES admin_users(id) ON DELETE SET NULL,
      admin_username TEXT NOT NULL DEFAULT 'system',
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL DEFAULT '',
      details TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS visitor_events (
      id ${PK},
      visitor_id TEXT NOT NULL,
      event_type TEXT NOT NULL DEFAULT 'page_view',
      page_path TEXT NOT NULL,
      section_name TEXT NOT NULL DEFAULT '',
      product_name TEXT NOT NULL DEFAULT '',
      referrer TEXT NOT NULL DEFAULT '',
      device_type TEXT NOT NULL DEFAULT 'Desktop',
      location_hint TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id ${PK},
      email TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'Active',
      created_at TEXT NOT NULL DEFAULT ${NOW_DEFAULT}
    )`,
    `CREATE INDEX IF NOT EXISTS idx_visitor_events_created ON visitor_events(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_visitor_events_path ON visitor_events(page_path)`,
    `CREATE INDEX IF NOT EXISTS idx_visitor_events_type ON visitor_events(event_type)`,
  ];
}

export async function initDatabase(): Promise<void> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const client = await getRootClient();
    const statements = getSchemaStatements();
    for (const stmt of statements) {
      await client.run(stmt);
    }
    await seedInitialData(client);
  })();
  return initPromise;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedInitialData(client: DbClient): Promise<void> {
  const adminRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM admin_users');
  if (Number(adminRow?.c ?? 0) === 0) {
    const initialEmail = process.env.ADMIN_INITIAL_EMAIL || 'zobowellness2025@gmail.com';
    const initialPass = process.env.ADMIN_INITIAL_PASSWORD || 'ZoboAdmin2025!';
    const hash = bcrypt.hashSync(initialPass, 10);
    await client.run(
      `INSERT INTO admin_users (username, email, password_hash, full_name, role)
       VALUES (?, ?, ?, ?, ?)`,
      ['admin', initialEmail, hash, 'Zobowellness Owner', 'owner']
    );
  }

  const settingsRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM global_settings');
  if (Number(settingsRow?.c ?? 0) === 0) {
    const defaults: Record<string, string> = {
      business_name: 'Zobowellness',
      website_url: 'zobowellness.faisal.com',
      whatsapp_number: '+15875453110',
      business_email: 'zobowellness2025@gmail.com',
      quotation_email: 'zobowellness2025@gmail.com',
      currency: 'CAD',
      light_logo_url: '/assets/aistudio/IMG-20261103-WA0016_9bc2fb38.jpg',
      dark_logo_url: '/assets/aistudio/IMG-20261103-WA0017_532d4ad8.jpg',
      announcement_text: 'Premium Grade A Hibiscus & Botanical Products for Wellness and Vitality',
      tagline: 'Choose Zobowellness... Choose Wellness',
      min_bulk_kg: '1000',
      bulk_quote_enabled: 'true',
      maintenance_mode: 'false',
      maintenance_message: 'We are updating our botanical inventory. Please contact us on WhatsApp for immediate orders.',
      seo_default_title: 'Zobowellness | Premium Grade A Hibiscus Leaves & Botanical Supplier',
      seo_default_description: 'Zobowellness supplies cleaned Grade A hibiscus leaves in bulk alongside herbs, botanical leaves, flowers, berries, seeds, and powders across Canada, UK, and USA.',
      social_facebook: '',
      social_instagram: '',
      social_youtube: '',
      social_linkedin: '',
      social_x: '',
    };
    for (const [k, v] of Object.entries(defaults)) {
      await client.run('INSERT INTO global_settings (key, value) VALUES (?, ?)', [k, v]);
    }
  }

  const catRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM categories');
  if (Number(catRow?.c ?? 0) === 0) {
    const categoriesSeed = [
      {
        name: 'Hibiscus Leaves',
        slug: 'hibiscus-leaves',
        description: 'Already-cleaned, rich crimson Grade A hibiscus leaves prepared for wholesalers, resellers, caterers, drink entrepreneurs, African stores, and families.',
        image_url: '/assets/botanical/hero-hibiscus.jpg',
        sort_order: 1,
      },
      {
        name: 'Herbs and Botanical Leaves',
        slug: 'herbs-and-botanical-leaves',
        description: 'Carefully dried and sorted whole botanical leaves including Moringa, Stevia, Sorghum leaf (wakaye), Lemon grass, Spearmint, and more.',
        image_url: '/assets/botanical/herbs-leaves.jpg',
        sort_order: 2,
      },
      {
        name: 'Flowers and Berries',
        slug: 'flowers-and-berries',
        description: 'Aromatic whole chamomile buds & flowers and dried hawthorn berries supplied for herbal blends and natural infusions.',
        image_url: '/assets/botanical/flowers-berries.jpg',
        sort_order: 3,
      },
      {
        name: 'Seeds',
        slug: 'seeds',
        description: 'Clean botanical and culinary seeds including Fennel seed, Pumpkin seed, Flaxseed, and Chia seed.',
        image_url: '/assets/botanical/seeds-powders.jpg',
        sort_order: 4,
      },
      {
        name: 'Powders',
        slug: 'powders',
        description: 'Finely milled botanical powders including Hibiscus powder, Hawthorn berry powder, Orange peel powder, and Pure cocoa powder.',
        image_url: '/assets/botanical/seeds-powders.jpg',
        sort_order: 5,
      },
      {
        name: 'Other Products',
        slug: 'other-products',
        description: 'Essential botanical roots and preparation supplies including Dandelion root and Empty teabag.',
        image_url: '/assets/botanical/herbs-leaves.jpg',
        sort_order: 6,
      },
    ];

    const catMap = new Map<string, number>();
    for (const c of categoriesSeed) {
      const catId = await client.insert(
        `INSERT INTO categories (name, slug, description, image_url, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [c.name, c.slug, c.description, c.image_url, c.sort_order]
      );
      catMap.set(c.name, catId);
    }

    const hibCatId = catMap.get('Hibiscus Leaves')!;
    const hibProductId = await client.insert(
      `INSERT INTO products (
        category_id, name, slug, short_description, description, sku,
        stock_quantity, is_available, is_featured, is_visible,
        seo_title, seo_description, image_alt, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?)`,
      [
        hibCatId,
        'Grade A Hibiscus Leaves',
        'grade-a-hibiscus-leaves',
        'Already-cleaned Grade A dried hibiscus calyces in flexible 1kg to 100kg bulk packaging.',
        'Our flagship Grade A hibiscus leaves are thoroughly cleaned and sorted to minimize dirt and foreign matter before packaging. Ideal for wholesalers, resellers, caterers, drink entrepreneurs, African grocery stores, and families. Available from 1kg up to 100kg bags; orders of 1,000kg and above are fulfilled via our bulk quotation desk.',
        'ZW-HIB-A',
        250,
        1,
        'Grade A Hibiscus Leaves (Cleaned Bulk Supply) | Zobowellness',
        'Order already-cleaned Grade A hibiscus leaves in 1kg to 100kg packs or request a bulk quote for 1,000kg+ from Zobowellness.',
        'Cleaned Grade A dried hibiscus leaves in wooden bowl',
        0,
      ]
    );

    await client.run(
      `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
       VALUES (?, ?, ?, 1, 0)`,
      [hibProductId, '/assets/botanical/hero-hibiscus.jpg', 'Cleaned Grade A dried hibiscus leaves']
    );

    const hibiscusSizes = [
      { label: '1kg', grams: 1000, price: null },
      { label: '2.5kg', grams: 2500, price: 70 },
      { label: '5kg', grams: 5000, price: 120 },
      { label: '10kg', grams: 10000, price: 220 },
      { label: '25kg', grams: 25000, price: null },
      { label: '50kg', grams: 50000, price: 800 },
      { label: '100kg', grams: 100000, price: 1400 },
    ];
    for (let idx = 0; idx < hibiscusSizes.length; idx++) {
      const sz = hibiscusSizes[idx];
      await client.run(
        `INSERT INTO product_variants (product_id, packaging_size, weight_grams, price, promo_price, stock_quantity, is_available, sort_order)
         VALUES (?, ?, ?, ?, NULL, 100, 1, ?)`,
        [hibProductId, sz.label, sz.grams, sz.price, idx + 1]
      );
    }

    const otherProducts: Array<{
      name: string;
      category: string;
      featured?: boolean;
      shortDesc: string;
      desc: string;
      img: string;
      variants?: Array<{ label: string; grams: number; price: number | null }>;
    }> = [
      {
        name: 'Stevia leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Dried whole stevia leaf for natural botanical infusions and blends.',
        desc: 'Cleanly dried stevia leaf supplied for tea blenders, beverage makers, and households.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 25 },
          { label: '500g', grams: 500, price: 40 },
          { label: '1kg', grams: 1000, price: 60 },
          { label: '5kg', grams: 5000, price: 250 },
        ],
      },
      {
        name: 'Moringa leaf',
        category: 'Herbs and Botanical Leaves',
        featured: true,
        shortDesc: 'Cleanly dried moringa leaf prepared for retail, catering, and botanical supply.',
        desc: 'Carefully sorted dried moringa leaves suited for herbal infusions, culinary preparation, and wholesale restocking.',
        img: '/assets/botanical/herbs-leaves.jpg',
      },
      {
        name: 'Sorghum leaf (wakaye)',
        category: 'Herbs and Botanical Leaves',
        featured: true,
        shortDesc: 'Traditional dried sorghum leaf (wakaye) for authentic culinary and beverage preparation.',
        desc: 'Cleanly prepared sorghum leaf (wakaye) sourced and packaged for African grocery stores, caterers, and home kitchens.',
        img: '/assets/botanical/herbs-leaves.jpg',
      },
      {
        name: 'Chamomile buds & flowers',
        category: 'Flowers and Berries',
        featured: true,
        shortDesc: 'Whole dried golden chamomile buds and flowers for soothing herbal infusions.',
        desc: 'Aromatic whole chamomile buds & flowers packaged for tea crafters, wellness shops, and wholesalers.',
        img: '/assets/botanical/flowers-berries.jpg',
        variants: [
          { label: '150g', grams: 150, price: 20 },
          { label: '500g', grams: 500, price: 35 },
        ],
      },
      {
        name: 'Lemon grass',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Fragrant dried lemon grass cuts for herbal teas and botanical beverage recipes.',
        desc: 'Clean dried lemon grass ready to pair with Grade A hibiscus leaves or steep on its own.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 20 },
          { label: '500g', grams: 500, price: 30 },
          { label: '1kg', grams: 1000, price: 50 },
        ],
      },
      {
        name: 'Green tea leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Dried green tea leaf available in 200g, 500g, and 1kg packages.',
        desc: 'Whole dried green tea leaf supplied for hospitality, tea blenders, and everyday preparation.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 21 },
          { label: '500g', grams: 500, price: 40 },
          { label: '1kg', grams: 1000, price: 60 },
        ],
      },
      {
        name: 'Olive leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Cleaned dried olive leaf for botanical teas and herbal formulations.',
        desc: 'Sorted dried olive leaf offered in convenient 250g, 500g, and 1kg quantities.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '250g', grams: 250, price: 20 },
          { label: '500g', grams: 500, price: 30 },
          { label: '1kg', grams: 1000, price: 40 },
        ],
      },
      {
        name: 'Hawthorn berries',
        category: 'Flowers and Berries',
        shortDesc: 'Sliced dried hawthorn berries for decoctions, infusions, and botanical stocks.',
        desc: 'Clean dried sliced hawthorn berries packed for herbalists, beverage makers, and specialty grocers.',
        img: '/assets/botanical/flowers-berries.jpg',
        variants: [
          { label: '200g', grams: 200, price: 40 },
          { label: '500g', grams: 500, price: 50 },
          { label: '1kg', grams: 1000, price: 80 },
          { label: '3kg', grams: 3000, price: 150 },
        ],
      },
      {
        name: 'Hawthorn berry powder',
        category: 'Powders',
        shortDesc: 'Finely ground hawthorn berry powder for blends and formulations.',
        desc: 'Milled hawthorn berry powder packaged in clean 100g, 250g, 500g, and 1kg quantities.',
        img: '/assets/botanical/seeds-powders.jpg',
      },
      {
        name: 'Lemon balm',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Dried lemon balm leaf with bright citrus-herbal aroma.',
        desc: 'Cleanly dried lemon balm leaf ideal for loose-leaf tea blends and botanical infusions.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '500g', grams: 500, price: 45 },
          { label: '1kg', grams: 1000, price: 60 },
          { label: '5kg', grams: 5000, price: 220 },
        ],
      },
      {
        name: 'Nettle leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Sorted dried nettle leaf supplied in 200g, 500g, and 1kg bags.',
        desc: 'Clean dried nettle leaf prepared for herbal tea crafters, retail stores, and wellness households.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 40 },
          { label: '500g', grams: 500, price: 50 },
          { label: '1kg', grams: 1000, price: 80 },
        ],
      },
      {
        name: 'Dandelion leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Dried dandelion leaf for herbal infusions and botanical blends.',
        desc: 'Cleaned dried dandelion leaf packaged in 200g, 500g, and 1kg units.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 30 },
          { label: '500g', grams: 500, price: 40 },
          { label: '1kg', grams: 1000, price: 60 },
        ],
      },
      {
        name: 'Orange peel powder',
        category: 'Powders',
        shortDesc: 'Aromatic dried orange peel powder for teas, spice blends, and beverages.',
        desc: 'Finely milled orange peel powder ideal for enhancing hibiscus infusions, baked goods, and herbal mixes.',
        img: '/assets/botanical/seeds-powders.jpg',
        variants: [
          { label: '500g', grams: 500, price: 20 },
          { label: '1kg', grams: 1000, price: 30 },
        ],
      },
      {
        name: 'Hibiscus powder',
        category: 'Powders',
        featured: true,
        shortDesc: 'Finely milled Grade A hibiscus powder for instant beverages, culinary recipes, and blending.',
        desc: 'Vibrant crimson hibiscus powder ground from cleaned hibiscus calyces in 100g, 250g, 500g, and 1kg packs.',
        img: '/assets/botanical/seeds-powders.jpg',
      },
      {
        name: 'Spearmint leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Crisp dried spearmint leaf for refreshing teas and zobo infusions.',
        desc: 'Clean dried spearmint leaf suitable for beverage entrepreneurs, caterers, and home brewing.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 40 },
          { label: '500g', grams: 500, price: 50 },
          { label: '1kg', grams: 1000, price: 80 },
        ],
      },
      {
        name: 'Fennel seed',
        category: 'Seeds',
        shortDesc: 'Clean whole fennel seed for herbal teas and culinary spice stocks.',
        desc: 'Aromatic whole fennel seed packed in 500g and 1kg options.',
        img: '/assets/botanical/seeds-powders.jpg',
        variants: [
          { label: '500g', grams: 500, price: 10 },
          { label: '1kg', grams: 1000, price: 12 },
        ],
      },
      {
        name: 'Pumpkin seed',
        category: 'Seeds',
        shortDesc: 'Sorted raw pumpkin seed in 500g, 1kg, and 5kg quantities.',
        desc: 'Clean pumpkin seed supplied for natural food retailers, bakeries, and family pantries.',
        img: '/assets/botanical/seeds-powders.jpg',
        variants: [
          { label: '500g', grams: 500, price: 20 },
          { label: '1kg', grams: 1000, price: 30 },
          { label: '5kg', grams: 5000, price: 100 },
        ],
      },
      {
        name: 'Flaxseed',
        category: 'Seeds',
        shortDesc: 'Clean whole flaxseed available in 500g and 1kg bags.',
        desc: 'Sorted whole flaxseed suited for culinary use, bakeries, and wellness groceries.',
        img: '/assets/botanical/seeds-powders.jpg',
        variants: [
          { label: '500g', grams: 500, price: 15 },
          { label: '1kg', grams: 1000, price: 20 },
        ],
      },
      {
        name: 'Chia seed',
        category: 'Seeds',
        featured: true,
        shortDesc: 'Clean whole chia seed supplied in 100g, 250g, 500g, and 1kg quantities.',
        desc: 'Carefully packaged chia seed for beverage businesses, health stores, and everyday kitchen use.',
        img: '/assets/botanical/seeds-powders.jpg',
      },
      {
        name: 'Dandelion root',
        category: 'Other Products',
        shortDesc: 'Dried cut dandelion root for traditional herbal decoctions and blends.',
        desc: 'Cleanly processed dandelion root available in 200g, 500g, and 1kg packaging.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 15 },
          { label: '500g', grams: 500, price: 25 },
          { label: '1kg', grams: 1000, price: 35 },
        ],
      },
      {
        name: 'Pure cocoa powder',
        category: 'Powders',
        shortDesc: 'Unsweetened pure cocoa powder for beverages, baking, and retail supply.',
        desc: 'Rich, pure cocoa powder offered in 100g, 250g, 500g, and 1kg packages.',
        img: '/assets/botanical/seeds-powders.jpg',
      },
      {
        name: 'Empty teabag',
        category: 'Other Products',
        shortDesc: 'Convenient empty filter teabags for loose-leaf botanical and hibiscus infusions.',
        desc: 'Clean empty teabags for preparing portioned hibiscus, herbal leaf, and flower infusions.',
        img: '/assets/botanical/herbs-leaves.jpg',
      },
      {
        name: 'Linden leaf',
        category: 'Herbs and Botanical Leaves',
        shortDesc: 'Dried aromatic linden leaf for calm herbal infusions and botanical blends.',
        desc: 'Carefully sorted dried linden leaf supplied in 200g, 500g, and 1kg quantities.',
        img: '/assets/botanical/herbs-leaves.jpg',
        variants: [
          { label: '200g', grams: 200, price: 50 },
          { label: '500g', grams: 500, price: 80 },
          { label: '1kg', grams: 1000, price: 140 },
        ],
      },
      {
        name: 'Dried locust beans',
        category: 'Other Products',
        shortDesc: 'Cleanly prepared traditional dried locust beans in 500g, 1kg, and 5kg packs.',
        desc: 'Authentic dried locust beans prepared for African grocery stores, caterers, and home kitchens.',
        img: '/assets/botanical/seeds-powders.jpg',
        variants: [
          { label: '500g', grams: 500, price: 25 },
          { label: '1kg', grams: 1000, price: 30 },
          { label: '5kg', grams: 5000, price: 120 },
        ],
      },
    ];

    const standardSizes = [
      { label: '100g', grams: 100, price: null },
      { label: '250g', grams: 250, price: null },
      { label: '500g', grams: 500, price: null },
      { label: '1kg', grams: 1000, price: null },
    ];

    for (let idx = 0; idx < otherProducts.length; idx++) {
      const p = otherProducts[idx];
      const catId = catMap.get(p.category)!;
      const slug = slugify(p.name);
      const sku = `ZW-${String(idx + 1).padStart(3, '0')}`;
      const prodId = await client.insert(
        `INSERT INTO products (
          category_id, name, slug, short_description, description, sku,
          stock_quantity, is_available, is_featured, is_visible,
          seo_title, seo_description, image_alt, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, 1, ?, ?, ?, ?)`,
        [
          catId,
          p.name,
          slug,
          p.shortDesc,
          p.desc,
          sku,
          100,
          p.featured ? 1 : 0,
          `${p.name} | Zobowellness`,
          p.shortDesc,
          p.name,
          idx + 1,
        ]
      );
      await client.run(
        `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
         VALUES (?, ?, ?, 1, 0)`,
        [prodId, p.img, p.name]
      );
      const variantsToInsert = p.variants || standardSizes;
      for (let vIdx = 0; vIdx < variantsToInsert.length; vIdx++) {
        const sz = variantsToInsert[vIdx];
        await client.run(
          `INSERT INTO product_variants (product_id, packaging_size, weight_grams, price, promo_price, stock_quantity, is_available, sort_order)
           VALUES (?, ?, ?, ?, NULL, 100, 1, ?)`,
          [prodId, sz.label, sz.grams, sz.price, vIdx + 1]
        );
      }
    }
  }

  const testRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM testimonials');
  if (Number(testRow?.c ?? 0) === 0) {
    const realScreenshots = [
      {
        url: '/assets/aistudio/IMG-20261114-WA0021_64ca7a6c.jpg',
        caption: 'Brampton, Ontario order feedback on colour, drying, and service',
        alt: 'WhatsApp customer feedback praising the rich colour and well-dried sorrel delivered to Brampton, Ontario',
      },
      {
        url: '/assets/aistudio/IMG-20261104-WA0004_4bfad27b.jpg',
        caption: 'Customer delivery confirmation praising leaf cleanliness',
        alt: 'WhatsApp conversation confirming clean hibiscus leaves delivery',
      },
      {
        url: '/assets/aistudio/IMG-20261104-WA0005_b90a2c17.jpg',
        caption: 'Customer video review highlighting fresh aroma and yield',
        alt: 'WhatsApp review highlighting clean leaves, fresh aroma, and how a little goes a long way',
      },
      {
        url: '/assets/aistudio/IMG-20261104-WA0006_1b23eefc.jpg',
        caption: 'Repeat customer feedback on freshness and packaging',
        alt: 'WhatsApp review noting fresh zobo quality, clean leaves, and neat packaging',
      },
      {
        url: '/assets/aistudio/IMG-20261114-WA0020_b8c7037a.jpg',
        caption: 'Feedback on zero-sorting cleanliness and natural taste',
        alt: 'WhatsApp feedback praising clean hibiscus leaves requiring no dirt sorting and rich natural taste',
      },
    ];
    for (let idx = 0; idx < realScreenshots.length; idx++) {
      const item = realScreenshots[idx];
      await client.run(
        `INSERT INTO testimonials (image_url, caption, alt_text, sort_order, is_active)
         VALUES (?, ?, ?, ?, 1)`,
        [item.url, item.caption, item.alt, idx + 1]
      );
    }
  }

  const zoneRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM delivery_zones');
  if (Number(zoneRow?.c ?? 0) === 0) {
    const zones = [
      ['Canada', 'CA', 'Confirmed via WhatsApp based on province & weight', 'Shipping across Canada. Final courier rate is confirmed on WhatsApp before dispatch.', 1],
      ['United Kingdom', 'UK', 'Confirmed via WhatsApp based on postcode & weight', 'Delivery across the UK. Rate and dispatch timeline confirmed on WhatsApp.', 2],
      ['United States', 'US', 'Confirmed via WhatsApp based on state & weight', 'Delivery across the USA. Rate and courier options confirmed on WhatsApp.', 3],
    ];
    for (const z of zones) {
      await client.run(
        `INSERT INTO delivery_zones (name, region_code, fee, free_threshold, estimated_time, notes, is_active, sort_order)
         VALUES (?, ?, NULL, NULL, ?, ?, 1, ?)`,
        z
      );
    }
  }

  const delSetRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM delivery_settings');
  if (Number(delSetRow?.c ?? 0) === 0) {
    await client.run(
      `INSERT INTO delivery_settings (id, policy_text, temporary_notice, is_delivery_available)
       VALUES (1, ?, '', 1)`,
      [
        'Zobowellness coordinates deliveries across Canada, the United Kingdom, and the United States. Where a flat delivery fee is not pre-configured for your region or order weight, our dispatch team confirms exact courier charges and transit estimates directly with you on WhatsApp prior to order confirmation.',
      ]
    );
  }

  const secRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM homepage_sections');
  if (Number(secRow?.c ?? 0) === 0) {
    const sections = [
      ['announcement_bar', 'Announcement Bar', 'Premium Grade A Hibiscus & Botanical Products for Wellness and Vitality', 'Delivery Available: UK, USA & Canada', '', '', '', '', '', JSON.stringify({ badge1: '100% Natural', badge2: 'Carefully Cleaned', badge3: 'Direct WhatsApp Support' }), 1],
      ['hero', 'Hero Section', 'Premium Grade A Hibiscus Leaves & Botanical Ingredients', 'Nature’s Goodness, Your Wellness', 'Zobowellness supplies already-cleaned Grade A hibiscus leaves in bulk alongside pure herbs, botanical leaves, flowers, berries, seeds, and powders for wholesalers, resellers, caterers, drink entrepreneurs, African stores, and families.', 'Shop Products', 'Request Bulk Quote', '/assets/botanical/hero-hibiscus.jpg', '', JSON.stringify({ highlights: ['100% Natural', 'Carefully Cleaned', 'Bulk Supply Available'] }), 2],
      ['categories', 'Product Categories', 'Our Product Categories', 'Explore cleaned hibiscus calyces, whole leaves, botanical flowers, seeds, and milled powders.', '', 'View All Products', '', '', '', '{}', 3],
      ['featured_products', 'Featured Products', 'Featured Botanical Supply', 'Select packaging sizes tailored for household preparation, retail shelves, and commercial beverage production.', '', 'Browse Full Catalogue', '', '', '', '{}', 4],
      ['promo_banner', 'Promotional Banner', 'Commercial & Wholesale Hibiscus Supply (1,000kg+)', 'Dedicated container and pallet-scale quotes for beverage manufacturers, African grocery distributors, and hospitality caterers.', '', 'Request Wholesale Quote', '', '', '', '{}', 5],
      ['about', 'About Zobowellness Section', 'About Zobowellness', 'Cleaned Grade A Botanicals Without Compromise', 'We supply premium, already-cleaned Grade A hibiscus leaves and a carefully curated catalogue of herbs, botanical leaves, flowers, berries, seeds, and powders. Our products are trusted by wholesalers, resellers, caterers, drink entrepreneurs, African stores, and families across Canada, the UK, and the USA.', 'Learn More', '', '/assets/botanical/about-infusion.jpg', '', JSON.stringify({ audience: ['Wholesalers & Distributors', 'Resellers & African Stores', 'Drink Entrepreneurs & Caterers', 'Families & Home Brewers'] }), 6],
      ['testimonials', 'Customer Testimonials', 'Verified WhatsApp Customer Reviews', 'Unedited feedback directly from customers who have received and brewed our cleaned Grade A hibiscus leaves.', '', 'View All Reviews', '', '', '', '{}', 7],
      ['bulk_quote', 'Bulk Quotation Section', 'Bulk Orders (1,000kg and Above)', 'Request a tailored wholesale quotation directly from our supply desk.', 'For commercial orders starting at 1,000kg and above, submit your company details and required tonnage below. Enquiries are sent directly to zobowellness2025@gmail.com and logged for immediate follow-up.', 'Send Enquiry', '', '', '', '{}', 8],
      ['delivery_info', 'Delivery Information Section', 'Delivery Information & Regions', 'Transparent regional dispatch for Canada, the United Kingdom, and the United States.', 'Select your delivery destination at checkout to review configured shipping fees or confirm courier charges directly via WhatsApp.', 'View Delivery Details', '', '', '', '{}', 9],
      ['contact', 'Contact Section', 'Direct Botanical Supply Desk', 'Reach Zobowellness directly on WhatsApp or by email for product enquiries, packaging options, and order tracking.', '', 'Chat on WhatsApp', '', '', '', '{}', 10],
      ['footer', 'Footer', 'Zobowellness', 'Choose Zobowellness... Choose Wellness', 'Supplying cleaned Grade A hibiscus leaves and botanical ingredients across Canada, the UK, and the USA.', '', '', '', '', '{}', 11],
    ];
    for (const s of sections) {
      await client.run(
        `INSERT INTO homepage_sections (
          section_key, label, title, subtitle, body,
          cta_primary_label, cta_secondary_label, image_url, secondary_image_url, extra_json, is_enabled, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
        s
      );
    }
  }

  const pageRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM website_pages');
  if (Number(pageRow?.c ?? 0) === 0) {
    const pages = [
      [
        'about',
        'About Us',
        'About Zobowellness',
        'Cleaned Grade A Hibiscus Leaves & Botanical Supply',
        'Zobowellness was established to solve a recurring problem faced by drink entrepreneurs, caterers, African grocery stores, and families: finding truly clean, Grade A hibiscus leaves that do not require hours of tedious sorting.\n\nAlongside our flagship Grade A hibiscus leaves in packaging from 1kg up to 100kg (and 1,000kg+ bulk quotations), we supply 22 herbs, botanical leaves, flowers, berries, seeds, powders, and preparation supplies.',
        JSON.stringify({
          pillars: [
            { title: 'Already-Cleaned Grade A Leaves', text: 'Carefully sorted and cleaned so customers save preparation time and get rich infusion yield.' },
            { title: 'Flexible Packaging Tiers', text: 'From 100g botanical packs and 1kg household bags up to 100kg wholesale sacks and 1,000kg+ bulk supply.' },
            { title: 'Direct Human Confirmation', text: 'Every order enquiry is confirmed cleanly via WhatsApp with transparent pricing and delivery coordination.' },
          ],
          targetCustomers: [
            'Wholesalers & Bulk Distributors',
            'Resellers & Private Label Brands',
            'Event Caterers & Hospitality Kitchens',
            'Zobo & Hibiscus Drink Entrepreneurs',
            'African & Caribbean Grocery Stores',
            'Families & Wellness Households',
          ],
        }),
        '/assets/botanical/about-infusion.jpg',
        'About Zobowellness | Bulk Grade A Hibiscus & Botanical Supplier',
        'Learn about Zobowellness, our cleaned Grade A hibiscus leaves, botanical catalogue, and bulk supply for wholesalers, caterers, stores, and families.',
      ],
      [
        'delivery',
        'Delivery Information',
        'Delivery Information',
        'Shipping Zones, Fees & Order Coordination',
        'We serve customers across Canada, the United Kingdom, and the United States. Where a delivery fee is configured by our team, it is automatically added to your order summary at checkout. Where shipping depends on bulk weight or regional courier rates, our team confirms the exact fee via WhatsApp before finalizing dispatch.',
        '{}',
        '/assets/botanical/hero-hibiscus.jpg',
        'Delivery Information | Zobowellness',
        'View Zobowellness delivery destinations, shipping policies, and order coordination across Canada, the UK, and the USA.',
      ],
      [
        'contact',
        'Contact Us',
        'Contact Zobowellness',
        'Speak with our team on WhatsApp or send an enquiry',
        'Whether you are placing a family order, stocking a retail shelf, or coordinating a 1,000kg+ wholesale shipment, reach out directly through WhatsApp, email, or the enquiry form below.',
        '{}',
        '/assets/botanical/herbs-leaves.jpg',
        'Contact Us | Zobowellness',
        'Contact Zobowellness via WhatsApp (+15875453110) or email (zobowellness2025@gmail.com) for hibiscus and botanical supply enquiries.',
      ],
    ];
    for (const p of pages) {
      await client.run(
        `INSERT INTO website_pages (slug, title, hero_title, hero_subtitle, body, extra_json, image_url, seo_title, seo_description, is_published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        p
      );
    }
  }

  const navRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM navigation_items');
  if (Number(navRow?.c ?? 0) === 0) {
    const headerLinks = [
      { label: 'Home', href: '/' },
      { label: 'Shop', href: '/shop' },
      { label: 'Bulk Quote', href: '/bulk-quote' },
      { label: 'About', href: '/about' },
      { label: 'Testimonials', href: '/testimonials' },
      { label: 'Delivery', href: '/delivery' },
      { label: 'Contact', href: '/contact' },
    ];
    for (let i = 0; i < headerLinks.length; i++) {
      await client.run(
        `INSERT INTO navigation_items (label, href, location, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
        [headerLinks[i].label, headerLinks[i].href, 'header', i + 1]
      );
      await client.run(
        `INSERT INTO navigation_items (label, href, location, sort_order, is_active) VALUES (?, ?, ?, ?, 1)`,
        [headerLinks[i].label, headerLinks[i].href, 'footer', i + 1]
      );
    }
  }

  const mediaRow = await client.get<{ c: number | string }>('SELECT COUNT(*) as c FROM media_assets');
  if (Number(mediaRow?.c ?? 0) === 0) {
    const seededAssets = [
      { filename: 'IMG-20261103-WA0016_9bc2fb38.jpg', original: 'Zobowellness Logo (Light)', url: '/assets/aistudio/IMG-20261103-WA0016_9bc2fb38.jpg', mime: 'image/jpeg', cat: 'logo', alt: 'Zobowellness light background logo' },
      { filename: 'IMG-20261103-WA0017_532d4ad8.jpg', original: 'Zobowellness Logo (Dark)', url: '/assets/aistudio/IMG-20261103-WA0017_532d4ad8.jpg', mime: 'image/jpeg', cat: 'logo', alt: 'Zobowellness dark background logo' },
      { filename: 'hero-hibiscus.jpg', original: 'Grade A Hibiscus Leaves Bowl', url: '/assets/botanical/hero-hibiscus.jpg', mime: 'image/jpeg', cat: 'product', alt: 'Dried Grade A hibiscus leaves in wooden bowl' },
      { filename: 'herbs-leaves.jpg', original: 'Botanical Herbs & Leaves', url: '/assets/botanical/herbs-leaves.jpg', mime: 'image/jpeg', cat: 'product', alt: 'Botanical herbs and dried leaves' },
      { filename: 'flowers-berries.jpg', original: 'Chamomile Flowers & Hawthorn Berries', url: '/assets/botanical/flowers-berries.jpg', mime: 'image/jpeg', cat: 'product', alt: 'Dried chamomile flowers and hawthorn berries' },
      { filename: 'seeds-powders.jpg', original: 'Botanical Seeds & Powders', url: '/assets/botanical/seeds-powders.jpg', mime: 'image/jpeg', cat: 'product', alt: 'Botanical seeds and milled powders' },
      { filename: 'about-infusion.jpg', original: 'Hibiscus Infusion Carafe', url: '/assets/botanical/about-infusion.jpg', mime: 'image/jpeg', cat: 'banner', alt: 'Steeped ruby hibiscus infusion carafe and petals' },
      { filename: 'IMG-20261114-WA0021_64ca7a6c.jpg', original: 'WhatsApp Review 1', url: '/assets/aistudio/IMG-20261114-WA0021_64ca7a6c.jpg', mime: 'image/jpeg', cat: 'testimonial', alt: 'WhatsApp review screenshot 1' },
      { filename: 'IMG-20261104-WA0004_4bfad27b.jpg', original: 'WhatsApp Review 2', url: '/assets/aistudio/IMG-20261104-WA0004_4bfad27b.jpg', mime: 'image/jpeg', cat: 'testimonial', alt: 'WhatsApp review screenshot 2' },
      { filename: 'IMG-20261104-WA0005_b90a2c17.jpg', original: 'WhatsApp Review 3', url: '/assets/aistudio/IMG-20261104-WA0005_b90a2c17.jpg', mime: 'image/jpeg', cat: 'testimonial', alt: 'WhatsApp review screenshot 3' },
      { filename: 'IMG-20261104-WA0006_1b23eefc.jpg', original: 'WhatsApp Review 4', url: '/assets/aistudio/IMG-20261104-WA0006_1b23eefc.jpg', mime: 'image/jpeg', cat: 'testimonial', alt: 'WhatsApp review screenshot 4' },
      { filename: 'IMG-20261114-WA0020_b8c7037a.jpg', original: 'WhatsApp Review 5', url: '/assets/aistudio/IMG-20261114-WA0020_b8c7037a.jpg', mime: 'image/jpeg', cat: 'testimonial', alt: 'WhatsApp review screenshot 5' },
    ];
    for (const a of seededAssets) {
      await client.run(
        `INSERT INTO media_assets (filename, original_name, url, mime_type, size_bytes, category, alt_text)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [a.filename, a.original, a.url, a.mime, 0, a.cat, a.alt]
      );
    }
  }
}

export async function logAdminActivity(
  adminId: number | null,
  adminUsername: string,
  action: string,
  entityType: string,
  entityId: string | number | bigint = '',
  details = ''
): Promise<void> {
  try {
    await db.run(
      `INSERT INTO admin_activity_logs (admin_id, admin_username, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [adminId, adminUsername, action, entityType, String(entityId), details]
    );
  } catch (err) {
    console.error('Activity log error:', err);
  }
}
