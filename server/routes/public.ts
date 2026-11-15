import { Router } from 'express';
import { db, dbTransaction } from '../db.ts';
import { sendBulkQuoteEmail } from '../email.ts';

export const publicRouter = Router();

async function getSettingsMap(): Promise<Record<string, string>> {
  const rows = await db.all<{ key: string; value: string }>('SELECT key, value FROM global_settings');
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.key] = r.value;
  }
  return map;
}

async function hydrateProducts(productRows: any[]) {
  if (productRows.length === 0) return [];
  const ids = productRows.map((p) => p.id);
  const placeholders = ids.map(() => '?').join(',');

  const [variants, images] = await Promise.all([
    db.all<any>(
      `SELECT * FROM product_variants WHERE product_id IN (${placeholders}) ORDER BY sort_order ASC, id ASC`,
      ids
    ),
    db.all<any>(
      `SELECT * FROM product_images WHERE product_id IN (${placeholders}) ORDER BY is_primary DESC, sort_order ASC, id ASC`,
      ids
    ),
  ]);

  const variantMap = new Map<number, any[]>();
  for (const v of variants) {
    const arr = variantMap.get(v.product_id) || [];
    arr.push(v);
    variantMap.set(v.product_id, arr);
  }

  const imageMap = new Map<number, any[]>();
  for (const img of images) {
    const arr = imageMap.get(img.product_id) || [];
    arr.push(img);
    imageMap.set(img.product_id, arr);
  }

  return productRows.map((p) => ({
    ...p,
    variants: variantMap.get(p.id) || [],
    images: imageMap.get(p.id) || [],
  }));
}

publicRouter.get('/health', async (_req, res) => {
  try {
    await db.get('SELECT 1 as ok');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, error: err instanceof Error ? err.message : 'Database error' });
  }
});

publicRouter.get('/storefront', async (_req, res) => {
  try {
    const [
      settings,
      sections,
      navigation,
      categories,
      featuredRows,
      testimonials,
      deliveryZones,
      deliverySettings,
    ] = await Promise.all([
      getSettingsMap(),
      db.all('SELECT * FROM homepage_sections ORDER BY sort_order ASC'),
      db.all('SELECT * FROM navigation_items WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'),
      db.all('SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'),
      db.all(
        `SELECT p.*, c.name as category_name, c.slug as category_slug
         FROM products p
         JOIN categories c ON p.category_id = c.id
         WHERE p.is_visible = 1 AND p.is_featured = 1 AND c.is_active = 1
         ORDER BY p.sort_order ASC, p.id ASC`
      ),
      db.all('SELECT * FROM testimonials WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'),
      db.all('SELECT * FROM delivery_zones WHERE is_active = 1 ORDER BY sort_order ASC, id ASC'),
      db.get('SELECT * FROM delivery_settings WHERE id = 1'),
    ]);

    const featuredProducts = await hydrateProducts(featuredRows);

    res.json({
      settings,
      sections,
      navigation,
      categories,
      featuredProducts,
      testimonials,
      deliveryZones,
      deliverySettings,
    });
  } catch (err) {
    console.error('Storefront load error:', err);
    res.status(500).json({ error: 'Failed to load storefront data.' });
  }
});

publicRouter.get('/products', async (req, res) => {
  try {
    const categorySlug = typeof req.query.category === 'string' ? req.query.category.trim() : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';
    const featured = req.query.featured === '1';

    let sql = `
      SELECT p.*, c.name as category_name, c.slug as category_slug
      FROM products p
      JOIN categories c ON p.category_id = c.id
      WHERE p.is_visible = 1 AND c.is_active = 1
    `;
    const params: any[] = [];

    if (categorySlug && categorySlug !== 'all') {
      sql += ' AND c.slug = ?';
      params.push(categorySlug);
    }
    if (featured) {
      sql += ' AND p.is_featured = 1';
    }
    if (search) {
      sql += ' AND (LOWER(p.name) LIKE ? OR LOWER(p.short_description) LIKE ? OR LOWER(p.description) LIKE ? OR LOWER(c.name) LIKE ?)';
      const like = `%${search}%`;
      params.push(like, like, like, like);
    }

    sql += ' ORDER BY p.sort_order ASC, p.id ASC';

    const rows = await db.all(sql, params);
    res.json({ products: await hydrateProducts(rows) });
  } catch (err) {
    console.error('Products fetch error:', err);
    res.status(500).json({ error: 'Failed to load products.' });
  }
});

publicRouter.get('/products/:slug', async (req, res) => {
  try {
    const row = await db.get(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ? AND p.is_visible = 1`,
      [req.params.slug]
    );

    if (!row) {
      res.status(404).json({ error: 'Product not found.' });
      return;
    }

    const hydrated = (await hydrateProducts([row]))[0];
    res.json({ product: hydrated });
  } catch (err) {
    console.error('Product detail error:', err);
    res.status(500).json({ error: 'Failed to load product.' });
  }
});

publicRouter.get('/pages/:slug', async (req, res) => {
  try {
    const page = await db.get(
      'SELECT * FROM website_pages WHERE slug = ? AND is_published = 1',
      [req.params.slug]
    );
    if (!page) {
      res.status(404).json({ error: 'Page not found.' });
      return;
    }
    res.json({ page });
  } catch (err) {
    console.error('Page fetch error:', err);
    res.status(500).json({ error: 'Failed to load page.' });
  }
});

publicRouter.post('/orders', async (req, res) => {
  try {
    const {
      customerName,
      customerPhone,
      customerEmail = '',
      deliveryZoneId,
      deliveryDestination = '',
      deliveryAddress,
      notes = '',
      items,
    } = req.body || {};

    if (!customerName || typeof customerName !== 'string' || customerName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your full name.' });
      return;
    }
    if (!customerPhone || typeof customerPhone !== 'string' || customerPhone.trim().length < 6) {
      res.status(400).json({ error: 'Please enter a valid phone or WhatsApp number.' });
      return;
    }
    if (!deliveryAddress || typeof deliveryAddress !== 'string' || deliveryAddress.trim().length < 4) {
      res.status(400).json({ error: 'Please enter your delivery address.' });
      return;
    }
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Your cart is empty.' });
      return;
    }

    const settings = await getSettingsMap();
    const currency = settings.currency || 'CAD';
    const whatsappRaw = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

    let zone: any = null;
    if (deliveryZoneId) {
      zone = await db.get(
        'SELECT * FROM delivery_zones WHERE id = ? AND is_active = 1',
        [Number(deliveryZoneId)]
      );
    }

    const destinationLabel = zone ? zone.name : (deliveryDestination || '').trim() || 'Not specified';

    let subtotal = 0;
    let hasUnpricedItems = false;
    const verifiedItems: Array<{
      productId: number;
      variantId: number;
      productName: string;
      packagingSize: string;
      quantity: number;
      unitPrice: number | null;
      itemSubtotal: number | null;
    }> = [];

    for (const item of items) {
      const variantId = Number(item.variantId);
      const quantity = Math.max(1, Math.min(9999, Math.floor(Number(item.quantity) || 1)));

      const row = await db.get<any>(
        `SELECT pv.*, p.name as product_name, p.is_available as product_available, p.is_visible
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.id = ?`,
        [variantId]
      );

      if (!row || !row.is_visible) {
        res.status(400).json({ error: 'One or more selected products are no longer available.' });
        return;
      }

      const activePrice =
        row.promo_price !== null && row.promo_price !== undefined
          ? Number(row.promo_price)
          : row.price !== null && row.price !== undefined
            ? Number(row.price)
            : null;

      if (activePrice === null) {
        hasUnpricedItems = true;
      } else {
        subtotal += activePrice * quantity;
      }

      verifiedItems.push({
        productId: row.product_id,
        variantId: row.id,
        productName: row.product_name,
        packagingSize: row.packaging_size,
        quantity,
        unitPrice: activePrice,
        itemSubtotal: activePrice !== null ? activePrice * quantity : null,
      });
    }

    let deliveryFee: number | null = null;
    let deliveryFeePending = 1;

    if (zone && zone.fee !== null && zone.fee !== undefined) {
      const zoneFee = Number(zone.fee);
      const freeThresh =
        zone.free_threshold !== null && zone.free_threshold !== undefined
          ? Number(zone.free_threshold)
          : null;

      if (freeThresh !== null && !hasUnpricedItems && subtotal >= freeThresh) {
        deliveryFee = 0;
      } else {
        deliveryFee = zoneFee;
      }
      deliveryFeePending = 0;
    }

    const estimatedTotal = subtotal + (deliveryFee ?? 0);
    const orderNumber = `ZW-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    const fmtMoney = (n: number) => `${currency} ${n.toFixed(2)}`;

    const itemLines = verifiedItems.map((it, i) => {
      const priceText =
        it.unitPrice !== null
          ? `${fmtMoney(it.unitPrice)} each | Subtotal: ${fmtMoney(it.itemSubtotal!)}`
          : 'Price to be confirmed on WhatsApp';
      return `${i + 1}. ${it.productName} (${it.packagingSize}) x ${it.quantity} — ${priceText}`;
    });

    const deliveryLine =
      deliveryFeePending === 1
        ? `Delivery Charge: To be confirmed via WhatsApp`
        : deliveryFee === 0
          ? `Delivery Charge: FREE (threshold met)`
          : `Delivery Charge: ${fmtMoney(deliveryFee!)}`;

    const totalLine = hasUnpricedItems
      ? `Estimated Total: To be confirmed (some items awaiting quote)${subtotal > 0 ? ` — Priced items subtotal: ${fmtMoney(subtotal)}` : ''}`
      : deliveryFeePending === 1
        ? `Estimated Total: ${fmtMoney(estimatedTotal)} + Delivery Charge (to be confirmed)`
        : `Estimated Total: ${fmtMoney(estimatedTotal)}`;

    const whatsappMessage = [
      `Hello Zobowellness, I would like to place an order enquiry.`,
      ``,
      `Order Reference: ${orderNumber}`,
      `Customer Name: ${customerName.trim()}`,
      `Phone Number: ${customerPhone.trim()}`,
      customerEmail.trim() ? `Email: ${customerEmail.trim()}` : '',
      ``,
      `Selected Products:`,
      ...itemLines,
      ``,
      `Delivery Location: ${destinationLabel}`,
      `Delivery Address: ${deliveryAddress.trim()}`,
      deliveryLine,
      totalLine,
      notes.trim() ? `Additional Instructions: ${notes.trim()}` : '',
      ``,
      `Please confirm availability and final payment details. Thank you!`,
    ]
      .filter((line) => line !== undefined)
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');

    const orderId = await dbTransaction(async (tx) => {
      const newId = await tx.insert(
        `INSERT INTO order_enquiries (
          order_number, customer_name, customer_phone, customer_email,
          delivery_zone_id, delivery_destination, delivery_address, notes,
          subtotal, delivery_fee, delivery_fee_pending, has_unpriced_items,
          estimated_total, currency, status, whatsapp_message
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'New enquiry', ?)`,
        [
          orderNumber,
          customerName.trim(),
          customerPhone.trim(),
          customerEmail.trim(),
          zone ? zone.id : null,
          destinationLabel,
          deliveryAddress.trim(),
          notes.trim(),
          subtotal,
          deliveryFee,
          deliveryFeePending,
          hasUnpricedItems ? 1 : 0,
          estimatedTotal,
          currency,
          whatsappMessage,
        ]
      );

      for (const it of verifiedItems) {
        await tx.run(
          `INSERT INTO order_items (
            order_id, product_id, variant_id, product_name, packaging_size, quantity, unit_price, subtotal
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId,
            it.productId,
            it.variantId,
            it.productName,
            it.packagingSize,
            it.quantity,
            it.unitPrice,
            it.itemSubtotal,
          ]
        );
      }
      return newId;
    });

    const whatsappUrl = `https://wa.me/${whatsappRaw}?text=${encodeURIComponent(whatsappMessage)}`;

    res.status(201).json({
      orderId,
      orderNumber,
      subtotal,
      deliveryFee,
      deliveryFeePending: deliveryFeePending === 1,
      hasUnpricedItems,
      estimatedTotal,
      currency,
      whatsappMessage,
      whatsappUrl,
    });
  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Unable to save order enquiry right now.' });
  }
});

publicRouter.post('/bulk-quotes', async (req, res) => {
  try {
    const settings = await getSettingsMap();
    if (settings.bulk_quote_enabled === 'false') {
      res.status(403).json({ error: 'Bulk quotation submissions are currently paused.' });
      return;
    }

    const {
      companyName,
      location,
      quantityRequired,
      phoneContact,
      email = '',
      productInterest = 'Grade A Hibiscus Leaves',
      notes = '',
    } = req.body || {};

    if (!companyName || typeof companyName !== 'string' || companyName.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your company or organization name.' });
      return;
    }
    if (!location || typeof location !== 'string' || location.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your delivery city/country.' });
      return;
    }
    if (!quantityRequired || typeof quantityRequired !== 'string' || quantityRequired.trim().length < 1) {
      res.status(400).json({ error: 'Please specify the quantity required (e.g. 1,000kg or 5 tonnes).' });
      return;
    }
    if (!phoneContact || typeof phoneContact !== 'string' || phoneContact.trim().length < 6) {
      res.status(400).json({ error: 'Please enter a valid phone or WhatsApp contact number.' });
      return;
    }

    const referenceCode = `BQ-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
    const targetEmail = settings.quotation_email || settings.business_email || 'zobowellness2025@gmail.com';

    const emailResult = await sendBulkQuoteEmail({
      referenceCode,
      toEmail: targetEmail,
      companyName: companyName.trim(),
      location: location.trim(),
      quantityRequired: quantityRequired.trim(),
      phoneContact: phoneContact.trim(),
      customerEmail: email.trim(),
      productInterest: productInterest.trim(),
      notes: notes.trim(),
    });

    const newId = await db.insert(
      `INSERT INTO bulk_quotations (
        reference_code, company_name, location, quantity_required, phone_contact,
        email, product_interest, notes, status, email_sent, email_log
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'New', ?, ?)`,
      [
        referenceCode,
        companyName.trim(),
        location.trim(),
        quantityRequired.trim(),
        phoneContact.trim(),
        email.trim(),
        productInterest.trim(),
        notes.trim(),
        emailResult.sent ? 1 : 0,
        emailResult.log,
      ]
    );

    res.status(201).json({
      id: newId,
      referenceCode,
      targetEmail,
      emailSent: emailResult.sent,
      message: `Bulk quotation request ${referenceCode} received. Our supply team (${targetEmail}) will follow up promptly.`,
    });
  } catch (err) {
    console.error('Bulk quote error:', err);
    res.status(500).json({ error: 'Unable to submit bulk quotation request.' });
  }
});

publicRouter.post('/contact', async (req, res) => {
  try {
    const { name, email, phone = '', subject = '', message } = req.body || {};
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      res.status(400).json({ error: 'Please enter your name.' });
      return;
    }
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }
    if (!message || typeof message !== 'string' || message.trim().length < 5) {
      res.status(400).json({ error: 'Please enter your message.' });
      return;
    }

    const newId = await db.insert(
      `INSERT INTO contact_messages (name, email, phone, subject, message, status)
       VALUES (?, ?, ?, ?, ?, 'Unread')`,
      [name.trim(), email.trim(), phone.trim(), subject.trim(), message.trim()]
    );

    res.status(201).json({
      id: newId,
      message: 'Thank you for contacting Zobowellness. Your message has been received.',
    });
  } catch (err) {
    console.error('Contact message error:', err);
    res.status(500).json({ error: 'Unable to send contact message.' });
  }
});

function detectDevice(ua: string): string {
  const lower = (ua || '').toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(lower)) return 'Tablet';
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|iemobile/.test(lower)) return 'Mobile';
  return 'Desktop';
}

publicRouter.post('/track', async (req, res) => {
  try {
    const {
      eventType = 'page_view',
      pagePath = '/',
      sectionName = '',
      productName = '',
      referrer = '',
      clientVisitorId = '',
    } = req.body || {};

    if (typeof pagePath !== 'string' || pagePath.startsWith('/admin')) {
      res.json({ ok: true, skipped: true });
      return;
    }

    const allowedTypes = ['page_view', 'section_view', 'action'];
    const safeType = allowedTypes.includes(eventType) ? eventType : 'page_view';

    let visitorId =
      req.cookies?.zobo_vid || (typeof clientVisitorId === 'string' && clientVisitorId.slice(0, 64)) || '';
    if (!visitorId) {
      visitorId = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      res.cookie('zobo_vid', visitorId, {
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 90 * 24 * 60 * 60 * 1000,
      });
    }

    const ua = String(req.headers['user-agent'] || '');
    const deviceType = detectDevice(ua);
    const countryHeader = String(
      req.headers['cf-ipcountry'] ||
        req.headers['x-vercel-ip-country'] ||
        req.headers['x-appengine-country'] ||
        ''
    ).trim();

    await db.run(
      `INSERT INTO visitor_events (visitor_id, event_type, page_path, section_name, product_name, referrer, device_type, location_hint)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        visitorId,
        safeType,
        pagePath.slice(0, 200),
        String(sectionName || '').slice(0, 80),
        String(productName || '').slice(0, 120),
        String(referrer || '').slice(0, 300),
        deviceType,
        countryHeader,
      ]
    );

    res.status(201).json({ ok: true });
  } catch {
    res.status(200).json({ ok: false });
  }
});

publicRouter.post('/newsletter', async (req, res) => {
  try {
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail)) {
      res.status(400).json({ error: 'Please enter a valid email address.' });
      return;
    }

    const existing = await db.get<{ id: number }>(
      'SELECT id FROM newsletter_subscribers WHERE LOWER(email) = LOWER(?)',
      [rawEmail]
    );

    if (existing) {
      res.status(200).json({
        subscribed: true,
        alreadySubscribed: true,
        message: 'You are already subscribed to Zobowellness promotional updates.',
      });
      return;
    }

    await db.run('INSERT INTO newsletter_subscribers (email, status) VALUES (?, ?)', [rawEmail, 'Active']);

    res.status(201).json({
      subscribed: true,
      alreadySubscribed: false,
      message: 'Subscribed! Thank you for joining Zobowellness promotional updates.',
    });
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    res.status(500).json({ error: 'Unable to complete subscription right now.' });
  }
});
