import { Router } from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db, dbTransaction, logAdminActivity, nowSqlTimestamp, todayUtcDate } from '../db.ts';
import { AuthenticatedRequest, requireAdminAuth, signAdminToken } from '../auth.ts';

export const adminRouter = Router();

const UPLOADS_DIR = path.resolve(process.cwd(), 'public', 'uploads');

function canWriteUploadsDir(): boolean {
  if (process.env.VERCEL === '1') return false;
  try {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    fs.accessSync(UPLOADS_DIR, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

const USE_DISK_UPLOADS = canWriteUploadsDir();

const storage = USE_DISK_UPLOADS
  ? multer.diskStorage({
      destination: (_req, _file, cb) => {
        cb(null, UPLOADS_DIR);
      },
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
        const base = path
          .basename(file.originalname, ext)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .slice(0, 40);
        cb(null, `${Date.now()}-${base}${ext}`);
      },
    })
  : multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: USE_DISK_UPLOADS ? 8 * 1024 * 1024 : 3 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, WebP, and GIF image files are allowed.'));
    }
  },
});

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ---------- AUTH ----------
adminRouter.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      res.status(400).json({ error: 'Username/email and password are required.' });
      return;
    }

    const user = await db.get<any>(
      'SELECT * FROM admin_users WHERE LOWER(username) = LOWER(?) OR LOWER(email) = LOWER(?)',
      [identifier.trim(), identifier.trim()]
    );

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your email/username and password.' });
      return;
    }

    await db.run('UPDATE admin_users SET last_login_at = ? WHERE id = ?', [nowSqlTimestamp(), user.id]);
    await logAdminActivity(user.id, user.username, 'LOGIN', 'admin_user', user.id, 'Administrator signed in');

    const token = signAdminToken({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
    });

    const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';

    res.cookie('zobo_admin_token', token, {
      httpOnly: true,
      sameSite: isHttps ? 'none' : 'lax',
      secure: isHttps,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      token,
      admin: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed.' });
  }
});

adminRouter.post('/logout', (req: AuthenticatedRequest, res) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('zobo_admin_token', {
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
  });
  res.json({ ok: true });
});

// Protect all routes below
adminRouter.use(requireAdminAuth);

adminRouter.get('/me', async (req: AuthenticatedRequest, res) => {
  const user = await db.get(
    'SELECT id, username, email, full_name, role, last_login_at, created_at FROM admin_users WHERE id = ?',
    [req.admin!.id]
  );
  if (!user) {
    res.status(401).json({ error: 'Admin account not found.' });
    return;
  }
  res.json({ admin: user });
});

adminRouter.put('/account', async (req: AuthenticatedRequest, res) => {
  try {
    const { fullName, email, username, currentPassword, newPassword } = req.body || {};
    const user = await db.get<any>('SELECT * FROM admin_users WHERE id = ?', [req.admin!.id]);
    if (!user) {
      res.status(404).json({ error: 'Account not found.' });
      return;
    }

    if (newPassword) {
      if (!currentPassword || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }
      if (newPassword.length < 8) {
        res.status(400).json({ error: 'New password must be at least 8 characters.' });
        return;
      }
      const nextHash = bcrypt.hashSync(newPassword, 10);
      await db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [nextHash, user.id]);
    }

    await db.run('UPDATE admin_users SET full_name = ?, email = ?, username = ? WHERE id = ?', [
      fullName?.trim() || user.full_name,
      email?.trim() || user.email,
      username?.trim() || user.username,
      user.id,
    ]);

    await logAdminActivity(user.id, user.username, 'UPDATE', 'admin_account', user.id, 'Updated admin profile or password');
    const updated = await db.get(
      'SELECT id, username, email, full_name, role, last_login_at FROM admin_users WHERE id = ?',
      [user.id]
    );
    res.json({ admin: updated });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to update admin account.' });
  }
});

// ---------- OVERVIEW ----------
adminRouter.get('/overview', async (_req, res) => {
  const today = todayUtcDate();
  const [
    totalProductsRow,
    availableProductsRow,
    outOfStockProductsRow,
    newOrdersRow,
    pendingOrdersRow,
    bulkQuotesRow,
    newBulkQuotesRow,
    unreadContactsRow,
    recentLogs,
    totalPageViewsRow,
    todayPageViewsRow,
    uniqueVisitorsRow,
  ] = await Promise.all([
    db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM products'),
    db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM products WHERE is_available = 1'),
    db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM products WHERE is_available = 0 OR stock_quantity <= 0'),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM order_enquiries WHERE status = 'New enquiry'"),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM order_enquiries WHERE status IN ('New enquiry', 'Awaiting confirmation', 'Processing')"),
    db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM bulk_quotations'),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM bulk_quotations WHERE status = 'New'"),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM contact_messages WHERE status = 'Unread'"),
    db.all('SELECT * FROM admin_activity_logs ORDER BY id DESC LIMIT 20'),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM visitor_events WHERE event_type = 'page_view'"),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM visitor_events WHERE event_type = 'page_view' AND SUBSTR(created_at, 1, 10) = ?", [today]),
    db.get<{ c: number | string }>('SELECT COUNT(DISTINCT visitor_id) as c FROM visitor_events'),
  ]);

  res.json({
    stats: {
      totalProducts: Number(totalProductsRow?.c ?? 0),
      availableProducts: Number(availableProductsRow?.c ?? 0),
      outOfStockProducts: Number(outOfStockProductsRow?.c ?? 0),
      newOrders: Number(newOrdersRow?.c ?? 0),
      pendingOrders: Number(pendingOrdersRow?.c ?? 0),
      bulkQuotes: Number(bulkQuotesRow?.c ?? 0),
      newBulkQuotes: Number(newBulkQuotesRow?.c ?? 0),
      unreadContacts: Number(unreadContactsRow?.c ?? 0),
      totalPageViews: Number(totalPageViewsRow?.c ?? 0),
      todayPageViews: Number(todayPageViewsRow?.c ?? 0),
      uniqueVisitors: Number(uniqueVisitorsRow?.c ?? 0),
    },
    recentLogs,
  });
});

// ---------- VISITOR ANALYTICS ----------
adminRouter.get('/visitors', async (_req, res) => {
  const today = todayUtcDate();
  const [
    totalPageViewsRow,
    todayPageViewsRow,
    uniqueVisitorsRow,
    todayUniqueVisitorsRow,
    topPages,
    sectionReach,
    topProducts,
    devices,
    recentVisits,
  ] = await Promise.all([
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM visitor_events WHERE event_type = 'page_view'"),
    db.get<{ c: number | string }>("SELECT COUNT(*) as c FROM visitor_events WHERE event_type = 'page_view' AND SUBSTR(created_at, 1, 10) = ?", [today]),
    db.get<{ c: number | string }>('SELECT COUNT(DISTINCT visitor_id) as c FROM visitor_events'),
    db.get<{ c: number | string }>('SELECT COUNT(DISTINCT visitor_id) as c FROM visitor_events WHERE SUBSTR(created_at, 1, 10) = ?', [today]),
    db.all<any>(
      `SELECT page_path, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors, MAX(created_at) as last_visited
       FROM visitor_events
       WHERE event_type = 'page_view'
       GROUP BY page_path
       ORDER BY views DESC
       LIMIT 25`
    ),
    db.all<any>(
      `SELECT section_name, COUNT(*) as views, COUNT(DISTINCT visitor_id) as unique_visitors
       FROM visitor_events
       WHERE event_type = 'section_view' AND section_name != ''
       GROUP BY section_name
       ORDER BY views DESC`
    ),
    db.all<any>(
      `SELECT product_name,
              SUM(CASE WHEN event_type = 'page_view' THEN 1 ELSE 0 END) as views,
              SUM(CASE WHEN section_name = 'add_to_cart' THEN 1 ELSE 0 END) as cart_adds
       FROM visitor_events
       WHERE product_name != ''
       GROUP BY product_name
       ORDER BY views DESC, cart_adds DESC
       LIMIT 15`
    ),
    db.all<any>(
      `SELECT device_type, COUNT(DISTINCT visitor_id) as visitors, COUNT(*) as views
       FROM visitor_events
       WHERE event_type = 'page_view'
       GROUP BY device_type
       ORDER BY views DESC`
    ),
    db.all<any>(
      `SELECT id, visitor_id, event_type, page_path, section_name, product_name, referrer, device_type, location_hint, created_at
       FROM visitor_events
       ORDER BY id DESC
       LIMIT 60`
    ),
  ]);

  res.json({
    summary: {
      totalPageViews: Number(totalPageViewsRow?.c ?? 0),
      todayPageViews: Number(todayPageViewsRow?.c ?? 0),
      uniqueVisitors: Number(uniqueVisitorsRow?.c ?? 0),
      todayUniqueVisitors: Number(todayUniqueVisitorsRow?.c ?? 0),
    },
    topPages: topPages.map((p) => ({
      ...p,
      views: Number(p.views),
      unique_visitors: Number(p.unique_visitors),
    })),
    sectionReach: sectionReach.map((s) => ({
      ...s,
      views: Number(s.views),
      unique_visitors: Number(s.unique_visitors),
    })),
    topProducts: topProducts.map((p) => ({
      ...p,
      views: Number(p.views),
      cart_adds: Number(p.cart_adds),
    })),
    devices: devices.map((d) => ({
      ...d,
      visitors: Number(d.visitors),
      views: Number(d.views),
    })),
    recentVisits,
  });
});

adminRouter.delete('/visitors', async (req: AuthenticatedRequest, res) => {
  await db.run('DELETE FROM visitor_events');
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'visitor_events', 'all', 'Cleared visitor analytics log');
  res.json({ ok: true });
});

// ---------- PRODUCTS ----------
adminRouter.get('/products', async (_req, res) => {
  const [products, variants, images] = await Promise.all([
    db.all<any>(
      `SELECT p.*, c.name as category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       ORDER BY p.sort_order ASC, p.id ASC`
    ),
    db.all<any>('SELECT * FROM product_variants ORDER BY sort_order ASC, id ASC'),
    db.all<any>('SELECT * FROM product_images ORDER BY is_primary DESC, sort_order ASC, id ASC'),
  ]);

  const enriched = products.map((p) => ({
    ...p,
    variants: variants.filter((v) => v.product_id === p.id),
    images: images.filter((i) => i.product_id === p.id),
  }));

  res.json({ products: enriched });
});

adminRouter.post('/products', async (req: AuthenticatedRequest, res) => {
  try {
    const {
      category_id,
      name,
      slug,
      short_description = '',
      description = '',
      sku = '',
      stock_quantity = 100,
      is_available = 1,
      is_featured = 0,
      is_visible = 1,
      seo_title = '',
      seo_description = '',
      image_alt = '',
      sort_order = 0,
      variants = [],
      images = [],
    } = req.body || {};

    if (!name || !category_id) {
      res.status(400).json({ error: 'Product name and category are required.' });
      return;
    }

    const finalSlug = (slug && slugify(slug)) || `${slugify(name)}-${Date.now().toString().slice(-4)}`;

    const productId = await dbTransaction(async (tx) => {
      const id = await tx.insert(
        `INSERT INTO products (
          category_id, name, slug, short_description, description, sku,
          stock_quantity, is_available, is_featured, is_visible,
          seo_title, seo_description, image_alt, sort_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          Number(category_id),
          name.trim(),
          finalSlug,
          short_description.trim(),
          description.trim(),
          sku.trim(),
          Number(stock_quantity) || 0,
          is_available ? 1 : 0,
          is_featured ? 1 : 0,
          is_visible ? 1 : 0,
          seo_title.trim(),
          seo_description.trim(),
          image_alt.trim(),
          Number(sort_order) || 0,
        ]
      );

      if (Array.isArray(variants) && variants.length > 0) {
        for (let idx = 0; idx < variants.length; idx++) {
          const v = variants[idx];
          const priceVal = v.price === '' || v.price === null || v.price === undefined ? null : Number(v.price);
          const promoVal = v.promo_price === '' || v.promo_price === null || v.promo_price === undefined ? null : Number(v.promo_price);
          await tx.run(
            `INSERT INTO product_variants (product_id, packaging_size, weight_grams, price, promo_price, stock_quantity, is_available, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              id,
              String(v.packaging_size || '100g').trim(),
              Number(v.weight_grams) || 0,
              priceVal !== null && Number.isFinite(priceVal) ? priceVal : null,
              promoVal !== null && Number.isFinite(promoVal) ? promoVal : null,
              Number(v.stock_quantity ?? 100),
              v.is_available === 0 || v.is_available === false ? 0 : 1,
              idx + 1,
            ]
          );
        }
      } else {
        const defaults = ['100g', '250g', '500g', '1kg'];
        for (let idx = 0; idx < defaults.length; idx++) {
          await tx.run(
            `INSERT INTO product_variants (product_id, packaging_size, weight_grams, price, promo_price, stock_quantity, is_available, sort_order)
             VALUES (?, ?, 0, NULL, NULL, 100, 1, ?)`,
            [id, defaults[idx], idx + 1]
          );
        }
      }

      if (Array.isArray(images)) {
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          if (img?.image_url) {
            await tx.run(
              `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [id, img.image_url, img.alt_text || name.trim(), idx === 0 ? 1 : 0, idx]
            );
          }
        }
      }

      return id;
    });

    await logAdminActivity(req.admin!.id, req.admin!.username, 'CREATE', 'product', productId, `Created product ${name}`);
    res.status(201).json({ id: productId });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to create product.' });
  }
});

adminRouter.put('/products/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const productId = Number(req.params.id);
    const existing = await db.get<any>('SELECT * FROM products WHERE id = ?', [productId]);
    if (!existing) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const {
      category_id,
      name,
      slug,
      short_description,
      description,
      sku,
      stock_quantity,
      is_available,
      is_featured,
      is_visible,
      seo_title,
      seo_description,
      image_alt,
      sort_order,
      variants,
      images,
    } = req.body || {};

    await dbTransaction(async (tx) => {
      await tx.run(
        `UPDATE products SET
          category_id = ?, name = ?, slug = ?, short_description = ?, description = ?, sku = ?,
          stock_quantity = ?, is_available = ?, is_featured = ?, is_visible = ?,
          seo_title = ?, seo_description = ?, image_alt = ?, sort_order = ?, updated_at = ?
         WHERE id = ?`,
        [
          category_id !== undefined ? Number(category_id) : existing.category_id,
          name !== undefined ? String(name).trim() : existing.name,
          slug !== undefined ? slugify(String(slug)) || existing.slug : existing.slug,
          short_description !== undefined ? String(short_description) : existing.short_description,
          description !== undefined ? String(description) : existing.description,
          sku !== undefined ? String(sku) : existing.sku,
          stock_quantity !== undefined ? Number(stock_quantity) : existing.stock_quantity,
          is_available !== undefined ? (is_available ? 1 : 0) : existing.is_available,
          is_featured !== undefined ? (is_featured ? 1 : 0) : existing.is_featured,
          is_visible !== undefined ? (is_visible ? 1 : 0) : existing.is_visible,
          seo_title !== undefined ? String(seo_title) : existing.seo_title,
          seo_description !== undefined ? String(seo_description) : existing.seo_description,
          image_alt !== undefined ? String(image_alt) : existing.image_alt,
          sort_order !== undefined ? Number(sort_order) : existing.sort_order,
          nowSqlTimestamp(),
          productId,
        ]
      );

      if (Array.isArray(variants)) {
        await tx.run('DELETE FROM product_variants WHERE product_id = ?', [productId]);
        for (let idx = 0; idx < variants.length; idx++) {
          const v = variants[idx];
          const priceVal = v.price === '' || v.price === null || v.price === undefined ? null : Number(v.price);
          const promoVal = v.promo_price === '' || v.promo_price === null || v.promo_price === undefined ? null : Number(v.promo_price);
          await tx.run(
            `INSERT INTO product_variants (product_id, packaging_size, weight_grams, price, promo_price, stock_quantity, is_available, sort_order)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              productId,
              String(v.packaging_size || '').trim() || 'Standard',
              Number(v.weight_grams) || 0,
              priceVal !== null && Number.isFinite(priceVal) ? priceVal : null,
              promoVal !== null && Number.isFinite(promoVal) ? promoVal : null,
              Number(v.stock_quantity ?? 100),
              v.is_available === 0 || v.is_available === false ? 0 : 1,
              idx + 1,
            ]
          );
        }
      }

      if (Array.isArray(images)) {
        await tx.run('DELETE FROM product_images WHERE product_id = ?', [productId]);
        for (let idx = 0; idx < images.length; idx++) {
          const img = images[idx];
          if (img?.image_url) {
            await tx.run(
              `INSERT INTO product_images (product_id, image_url, alt_text, is_primary, sort_order)
               VALUES (?, ?, ?, ?, ?)`,
              [productId, img.image_url, img.alt_text || existing.name, idx === 0 ? 1 : 0, idx]
            );
          }
        }
      }
    });

    await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'product', productId, `Updated product ${name || existing.name}`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Failed to update product.' });
  }
});

adminRouter.delete('/products/:id', async (req: AuthenticatedRequest, res) => {
  const productId = Number(req.params.id);
  const existing = await db.get<any>('SELECT name FROM products WHERE id = ?', [productId]);
  if (!existing) {
    res.status(404).json({ error: 'Product not found.' });
    return;
  }
  await db.run('DELETE FROM products WHERE id = ?', [productId]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'product', productId, `Deleted product ${existing.name}`);
  res.json({ ok: true });
});

// ---------- CATEGORIES ----------
adminRouter.get('/categories', async (_req, res) => {
  const categories = await db.all<any>(
    `SELECT c.*, COUNT(p.id) as product_count
     FROM categories c
     LEFT JOIN products p ON p.category_id = c.id
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.id ASC`
  );
  res.json({
    categories: categories.map((c) => ({
      ...c,
      product_count: Number(c.product_count ?? 0),
    })),
  });
});

adminRouter.post('/categories', async (req: AuthenticatedRequest, res) => {
  try {
    const { name, description = '', image_url = '', sort_order = 0, is_active = 1 } = req.body || {};
    if (!name || !String(name).trim()) {
      res.status(400).json({ error: 'Category name is required.' });
      return;
    }
    const slug = slugify(String(name));
    const id = await db.insert(
      'INSERT INTO categories (name, slug, description, image_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [String(name).trim(), slug, description, image_url, Number(sort_order) || 0, is_active ? 1 : 0]
    );
    await logAdminActivity(req.admin!.id, req.admin!.username, 'CREATE', 'category', id, `Created category ${name}`);
    res.status(201).json({ id });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to create category.' });
  }
});

adminRouter.put('/categories/:id', async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db.get<any>('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Category not found.' });
      return;
    }
    const { name, description, image_url, sort_order, is_active } = req.body || {};
    const nextName = name !== undefined ? String(name).trim() : existing.name;
    await db.run(
      'UPDATE categories SET name = ?, slug = ?, description = ?, image_url = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [
        nextName,
        slugify(nextName),
        description !== undefined ? description : existing.description,
        image_url !== undefined ? image_url : existing.image_url,
        sort_order !== undefined ? Number(sort_order) : existing.sort_order,
        is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
        id,
      ]
    );
    await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'category', id, `Updated category ${nextName}`);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to update category.' });
  }
});

adminRouter.delete('/categories/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const countRow = await db.get<{ c: number | string }>('SELECT COUNT(*) as c FROM products WHERE category_id = ?', [id]);
  const count = Number(countRow?.c ?? 0);
  if (count > 0) {
    res.status(400).json({ error: `Cannot delete category with ${count} assigned products. Reassign products first.` });
    return;
  }
  await db.run('DELETE FROM categories WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'category', id, 'Deleted category');
  res.json({ ok: true });
});

// ---------- ORDERS ----------
adminRouter.get('/orders', async (_req, res) => {
  const [orders, items] = await Promise.all([
    db.all<any>('SELECT * FROM order_enquiries ORDER BY id DESC'),
    db.all<any>('SELECT * FROM order_items ORDER BY id ASC'),
  ]);
  const enriched = orders.map((o) => ({
    ...o,
    items: items.filter((i) => i.order_id === o.id),
  }));
  res.json({ orders: enriched });
});

adminRouter.put('/orders/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status, notes } = req.body || {};
  const allowed = ['New enquiry', 'Awaiting confirmation', 'Confirmed', 'Processing', 'Completed', 'Cancelled'];
  if (status && !allowed.includes(status)) {
    res.status(400).json({ error: 'Invalid order status.' });
    return;
  }
  const existing = await db.get<any>('SELECT * FROM order_enquiries WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Order enquiry not found.' });
    return;
  }
  await db.run('UPDATE order_enquiries SET status = ?, notes = ?, updated_at = ? WHERE id = ?', [
    status ?? existing.status,
    notes !== undefined ? notes : existing.notes,
    nowSqlTimestamp(),
    id,
  ]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'order', existing.order_number, `Status -> ${status ?? existing.status}`);
  res.json({ ok: true });
});

adminRouter.delete('/orders/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.run('DELETE FROM order_enquiries WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'order', id, 'Deleted order enquiry');
  res.json({ ok: true });
});

// ---------- BULK QUOTATIONS ----------
adminRouter.get('/bulk-quotes', async (_req, res) => {
  const quotes = await db.all('SELECT * FROM bulk_quotations ORDER BY id DESC');
  res.json({ quotes });
});

adminRouter.put('/bulk-quotes/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status, internal_notes } = req.body || {};
  const existing = await db.get<any>('SELECT * FROM bulk_quotations WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Bulk quotation not found.' });
    return;
  }
  await db.run('UPDATE bulk_quotations SET status = ?, internal_notes = ?, updated_at = ? WHERE id = ?', [
    status ?? existing.status,
    internal_notes !== undefined ? internal_notes : existing.internal_notes,
    nowSqlTimestamp(),
    id,
  ]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'bulk_quote', existing.reference_code, `Status -> ${status ?? existing.status}`);
  res.json({ ok: true });
});

adminRouter.delete('/bulk-quotes/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.run('DELETE FROM bulk_quotations WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'bulk_quote', id, 'Deleted bulk quotation');
  res.json({ ok: true });
});

// ---------- TESTIMONIALS ----------
adminRouter.get('/testimonials', async (_req, res) => {
  const testimonials = await db.all('SELECT * FROM testimonials ORDER BY sort_order ASC, id ASC');
  res.json({ testimonials });
});

adminRouter.post('/testimonials', async (req: AuthenticatedRequest, res) => {
  const { image_url, caption = '', alt_text = '', sort_order = 0, is_active = 1 } = req.body || {};
  if (!image_url) {
    res.status(400).json({ error: 'Testimonial screenshot URL is required.' });
    return;
  }
  const id = await db.insert(
    'INSERT INTO testimonials (image_url, caption, alt_text, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
    [image_url, caption, alt_text || caption || 'Customer WhatsApp testimonial screenshot', Number(sort_order) || 0, is_active ? 1 : 0]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'CREATE', 'testimonial', id, 'Added testimonial screenshot');
  res.status(201).json({ id });
});

adminRouter.put('/testimonials/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = await db.get<any>('SELECT * FROM testimonials WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Testimonial not found.' });
    return;
  }
  const { image_url, caption, alt_text, sort_order, is_active } = req.body || {};
  await db.run('UPDATE testimonials SET image_url = ?, caption = ?, alt_text = ?, sort_order = ?, is_active = ? WHERE id = ?', [
    image_url ?? existing.image_url,
    caption !== undefined ? caption : existing.caption,
    alt_text !== undefined ? alt_text : existing.alt_text,
    sort_order !== undefined ? Number(sort_order) : existing.sort_order,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    id,
  ]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'testimonial', id, 'Updated testimonial');
  res.json({ ok: true });
});

adminRouter.delete('/testimonials/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.run('DELETE FROM testimonials WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'testimonial', id, 'Removed testimonial');
  res.json({ ok: true });
});

// ---------- MEDIA LIBRARY ----------
adminRouter.get('/media', async (_req, res) => {
  const assets = await db.all('SELECT * FROM media_assets ORDER BY id DESC');
  res.json({ assets });
});

adminRouter.post('/media/upload', upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please select a valid image file (JPG, PNG, WebP, or GIF).' });
      return;
    }

    const category = typeof req.body?.category === 'string' ? req.body.category : 'general';
    const altText = typeof req.body?.alt_text === 'string' ? req.body.alt_text : req.file.originalname;

    let filename = req.file.filename || `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]+/g, '-')}`;
    let url: string;

    if (USE_DISK_UPLOADS && req.file.filename) {
      url = `/uploads/${req.file.filename}`;
    } else if (req.file.buffer) {
      // Serverless / Vercel safe fallback: persist image directly as data URI
      url = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    } else {
      res.status(400).json({ error: 'Unable to read uploaded image buffer.' });
      return;
    }

    const id = await db.insert(
      `INSERT INTO media_assets (filename, original_name, url, mime_type, size_bytes, category, alt_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [filename, req.file.originalname, url, req.file.mimetype, req.file.size, category, altText]
    );

    await logAdminActivity(req.admin!.id, req.admin!.username, 'UPLOAD', 'media', id, `Uploaded ${req.file.originalname}`);
    res.status(201).json({
      asset: {
        id,
        filename,
        original_name: req.file.originalname,
        url,
        mime_type: req.file.mimetype,
        size_bytes: req.file.size,
        category,
        alt_text: altText,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Unable to upload media asset.' });
  }
});

adminRouter.delete('/media/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const asset = await db.get<any>('SELECT * FROM media_assets WHERE id = ?', [id]);
  if (!asset) {
    res.status(404).json({ error: 'Media asset not found.' });
    return;
  }
  if (USE_DISK_UPLOADS && typeof asset.url === 'string' && asset.url.startsWith('/uploads/')) {
    const filePath = path.join(UPLOADS_DIR, path.basename(asset.url));
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
  await db.run('DELETE FROM media_assets WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'media', id, `Deleted media ${asset.original_name}`);
  res.json({ ok: true });
});

// ---------- DELIVERY MANAGEMENT ----------
adminRouter.get('/delivery', async (_req, res) => {
  const [zones, settings] = await Promise.all([
    db.all('SELECT * FROM delivery_zones ORDER BY sort_order ASC, id ASC'),
    db.get('SELECT * FROM delivery_settings WHERE id = 1'),
  ]);
  res.json({ zones, settings });
});

adminRouter.post('/delivery/zones', async (req: AuthenticatedRequest, res) => {
  const { name, region_code = '', fee, free_threshold, estimated_time = '', notes = '', is_active = 1, sort_order = 0 } = req.body || {};
  if (!name || !String(name).trim()) {
    res.status(400).json({ error: 'Destination name is required.' });
    return;
  }
  const feeVal = fee === '' || fee === null || fee === undefined ? null : Number(fee);
  const threshVal = free_threshold === '' || free_threshold === null || free_threshold === undefined ? null : Number(free_threshold);

  const id = await db.insert(
    `INSERT INTO delivery_zones (name, region_code, fee, free_threshold, estimated_time, notes, is_active, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(name).trim(),
      String(region_code).trim(),
      feeVal !== null && Number.isFinite(feeVal) ? feeVal : null,
      threshVal !== null && Number.isFinite(threshVal) ? threshVal : null,
      String(estimated_time),
      String(notes),
      is_active ? 1 : 0,
      Number(sort_order) || 0,
    ]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'CREATE', 'delivery_zone', id, `Added zone ${name}`);
  res.status(201).json({ id });
});

adminRouter.put('/delivery/zones/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = await db.get<any>('SELECT * FROM delivery_zones WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Delivery zone not found.' });
    return;
  }
  const { name, region_code, fee, free_threshold, estimated_time, notes, is_active, sort_order } = req.body || {};
  const feeVal = fee === '' || fee === null ? null : fee !== undefined ? Number(fee) : existing.fee;
  const threshVal = free_threshold === '' || free_threshold === null ? null : free_threshold !== undefined ? Number(free_threshold) : existing.free_threshold;

  await db.run(
    `UPDATE delivery_zones SET name = ?, region_code = ?, fee = ?, free_threshold = ?, estimated_time = ?, notes = ?, is_active = ?, sort_order = ? WHERE id = ?`,
    [
      name !== undefined ? String(name).trim() : existing.name,
      region_code !== undefined ? String(region_code).trim() : existing.region_code,
      feeVal !== null && Number.isFinite(feeVal) ? feeVal : null,
      threshVal !== null && Number.isFinite(threshVal) ? threshVal : null,
      estimated_time !== undefined ? String(estimated_time) : existing.estimated_time,
      notes !== undefined ? String(notes) : existing.notes,
      is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
      sort_order !== undefined ? Number(sort_order) : existing.sort_order,
      id,
    ]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'delivery_zone', id, `Updated zone ${name || existing.name}`);
  res.json({ ok: true });
});

adminRouter.delete('/delivery/zones/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.run('DELETE FROM delivery_zones WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'delivery_zone', id, 'Deleted delivery zone');
  res.json({ ok: true });
});

adminRouter.put('/delivery/settings', async (req: AuthenticatedRequest, res) => {
  const { policy_text, temporary_notice, is_delivery_available } = req.body || {};
  await db.run(
    'UPDATE delivery_settings SET policy_text = ?, temporary_notice = ?, is_delivery_available = ?, updated_at = ? WHERE id = 1',
    [policy_text ?? '', temporary_notice ?? '', is_delivery_available ? 1 : 0, nowSqlTimestamp()]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'delivery_settings', 1, 'Updated delivery policy & availability');
  res.json({ ok: true });
});

// ---------- HOMEPAGE SECTIONS & FEATURE SWITCHES ----------
adminRouter.get('/homepage', async (_req, res) => {
  const sections = await db.all('SELECT * FROM homepage_sections ORDER BY sort_order ASC');
  res.json({ sections });
});

adminRouter.put('/homepage/:sectionKey', async (req: AuthenticatedRequest, res) => {
  const { sectionKey } = req.params;
  const existing = await db.get<any>('SELECT * FROM homepage_sections WHERE section_key = ?', [sectionKey]);
  if (!existing) {
    res.status(404).json({ error: 'Homepage section not found.' });
    return;
  }
  const {
    title,
    subtitle,
    body,
    cta_primary_label,
    cta_secondary_label,
    image_url,
    secondary_image_url,
    extra_json,
    is_enabled,
    sort_order,
  } = req.body || {};

  await db.run(
    `UPDATE homepage_sections SET
      title = ?, subtitle = ?, body = ?, cta_primary_label = ?, cta_secondary_label = ?,
      image_url = ?, secondary_image_url = ?, extra_json = ?, is_enabled = ?, sort_order = ?, updated_at = ?
     WHERE section_key = ?`,
    [
      title !== undefined ? title : existing.title,
      subtitle !== undefined ? subtitle : existing.subtitle,
      body !== undefined ? body : existing.body,
      cta_primary_label !== undefined ? cta_primary_label : existing.cta_primary_label,
      cta_secondary_label !== undefined ? cta_secondary_label : existing.cta_secondary_label,
      image_url !== undefined ? image_url : existing.image_url,
      secondary_image_url !== undefined ? secondary_image_url : existing.secondary_image_url,
      extra_json !== undefined ? (typeof extra_json === 'string' ? extra_json : JSON.stringify(extra_json)) : existing.extra_json,
      is_enabled !== undefined ? (is_enabled ? 1 : 0) : existing.is_enabled,
      sort_order !== undefined ? Number(sort_order) : existing.sort_order,
      nowSqlTimestamp(),
      sectionKey,
    ]
  );

  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'homepage_section', sectionKey, `Updated ${sectionKey}`);
  res.json({ ok: true });
});

// ---------- WEBSITE PAGES ----------
adminRouter.get('/pages', async (_req, res) => {
  const pages = await db.all('SELECT * FROM website_pages ORDER BY id ASC');
  res.json({ pages });
});

adminRouter.put('/pages/:slug', async (req: AuthenticatedRequest, res) => {
  const { slug } = req.params;
  const existing = await db.get<any>('SELECT * FROM website_pages WHERE slug = ?', [slug]);
  if (!existing) {
    res.status(404).json({ error: 'Website page not found.' });
    return;
  }
  const { title, hero_title, hero_subtitle, body, extra_json, image_url, seo_title, seo_description, is_published } = req.body || {};
  await db.run(
    `UPDATE website_pages SET
      title = ?, hero_title = ?, hero_subtitle = ?, body = ?, extra_json = ?,
      image_url = ?, seo_title = ?, seo_description = ?, is_published = ?, updated_at = ?
     WHERE slug = ?`,
    [
      title ?? existing.title,
      hero_title ?? existing.hero_title,
      hero_subtitle ?? existing.hero_subtitle,
      body ?? existing.body,
      extra_json !== undefined ? (typeof extra_json === 'string' ? extra_json : JSON.stringify(extra_json)) : existing.extra_json,
      image_url ?? existing.image_url,
      seo_title ?? existing.seo_title,
      seo_description ?? existing.seo_description,
      is_published !== undefined ? (is_published ? 1 : 0) : existing.is_published,
      nowSqlTimestamp(),
      slug,
    ]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'website_page', slug, `Updated page /${slug}`);
  res.json({ ok: true });
});

// ---------- NAVIGATION ----------
adminRouter.get('/navigation', async (_req, res) => {
  const items = await db.all('SELECT * FROM navigation_items ORDER BY location ASC, sort_order ASC, id ASC');
  res.json({ items });
});

adminRouter.post('/navigation', async (req: AuthenticatedRequest, res) => {
  const { label, href, location = 'header', sort_order = 0, is_active = 1 } = req.body || {};
  if (!label || !href) {
    res.status(400).json({ error: 'Label and link destination are required.' });
    return;
  }
  const id = await db.insert(
    'INSERT INTO navigation_items (label, href, location, sort_order, is_active) VALUES (?, ?, ?, ?, ?)',
    [label.trim(), href.trim(), location, Number(sort_order) || 0, is_active ? 1 : 0]
  );
  await logAdminActivity(req.admin!.id, req.admin!.username, 'CREATE', 'navigation', id, `Added nav link ${label}`);
  res.status(201).json({ id });
});

adminRouter.put('/navigation/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const existing = await db.get<any>('SELECT * FROM navigation_items WHERE id = ?', [id]);
  if (!existing) {
    res.status(404).json({ error: 'Navigation item not found.' });
    return;
  }
  const { label, href, location, sort_order, is_active } = req.body || {};
  await db.run('UPDATE navigation_items SET label = ?, href = ?, location = ?, sort_order = ?, is_active = ? WHERE id = ?', [
    label ?? existing.label,
    href ?? existing.href,
    location ?? existing.location,
    sort_order !== undefined ? Number(sort_order) : existing.sort_order,
    is_active !== undefined ? (is_active ? 1 : 0) : existing.is_active,
    id,
  ]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'navigation', id, `Updated nav link ${label || existing.label}`);
  res.json({ ok: true });
});

adminRouter.delete('/navigation/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  await db.run('DELETE FROM navigation_items WHERE id = ?', [id]);
  await logAdminActivity(req.admin!.id, req.admin!.username, 'DELETE', 'navigation', id, 'Deleted nav link');
  res.json({ ok: true });
});

// ---------- CONTACT MESSAGES ----------
adminRouter.get('/contacts', async (_req, res) => {
  const messages = await db.all('SELECT * FROM contact_messages ORDER BY id DESC');
  res.json({ messages });
});

adminRouter.put('/contacts/:id', async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};
  await db.run('UPDATE contact_messages SET status = ? WHERE id = ?', [status || 'Read', id]);
  res.json({ ok: true });
});

adminRouter.delete('/contacts/:id', async (req: AuthenticatedRequest, res) => {
  await db.run('DELETE FROM contact_messages WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

// ---------- GLOBAL SETTINGS ----------
adminRouter.get('/settings', async (_req, res) => {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM global_settings');
  const settings: Record<string, string> = {};
  for (const r of rows) settings[r.key] = r.value;
  res.json({ settings });
});

adminRouter.put('/settings', async (req: AuthenticatedRequest, res) => {
  const updates = req.body?.settings;
  if (!updates || typeof updates !== 'object') {
    res.status(400).json({ error: 'Invalid settings payload.' });
    return;
  }
  const ts = nowSqlTimestamp();
  await dbTransaction(async (tx) => {
    for (const [k, v] of Object.entries(updates)) {
      await tx.run(
        `INSERT INTO global_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        [k, String(v ?? ''), ts]
      );
    }
  });
  await logAdminActivity(req.admin!.id, req.admin!.username, 'UPDATE', 'global_settings', 'global', 'Updated global settings');
  res.json({ ok: true });
});
