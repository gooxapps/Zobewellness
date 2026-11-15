import express, { Express } from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { db, initDatabase } from './db.ts';
import { publicRouter } from './routes/public.ts';
import { adminRouter } from './routes/admin.ts';

export async function createApp(): Promise<Express> {
  await initDatabase();

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '6mb' }));
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Ensure DB is initialized on every invocation (no-op after first warm run)
  app.use(async (_req, _res, next) => {
    try {
      await initDatabase();
      next();
    } catch (err) {
      next(err);
    }
  });

  // Serve local uploaded media files when present (non-Vercel writable environments)
  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (fs.existsSync(uploadsDir)) {
    app.use('/uploads', express.static(uploadsDir));
  }

  // API Routes
  app.use('/api', publicRouter);
  app.use('/api/admin', adminRouter);

  // SEO: robots.txt and dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin',
        'Disallow: /api/admin',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n')
    );
  });

  app.get('/sitemap.xml', async (req, res) => {
    try {
      const baseUrl = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
      const staticPaths = ['/', '/shop', '/bulk-quote', '/about', '/testimonials', '/delivery', '/contact'];
      const products = await db.all<{ slug: string; updated_at: string }>(
        'SELECT slug, updated_at FROM products WHERE is_visible = 1'
      );

      const urls = [
        ...staticPaths.map(
          (p) =>
            `<url><loc>${baseUrl}${p}</loc><changefreq>weekly</changefreq><priority>${p === '/' ? '1.0' : '0.8'}</priority></url>`
        ),
        ...products.map(
          (p) =>
            `<url><loc>${baseUrl}/product/${p.slug}</loc><lastmod>${String(p.updated_at || '').slice(0, 10) || '2026-11-14'}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`
        ),
      ];

      res
        .type('application/xml')
        .send(
          `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
        );
    } catch {
      res.status(500).type('text/plain').send('Unable to generate sitemap.');
    }
  });

  return app;
}
