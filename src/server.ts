import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *   // Handle API request
 * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

const API_BASE = 'https://api-shop.solterprise.com/api/';
const SITE_URL = 'https://shop.solterprise.com';
const LANGUAGES = ['ro', 'ru'];

let sitemapCache: { xml: string; timestamp: number } | null = null;
const SITEMAP_TTL = 3600000; // 1 hour

function slugify(value: string): string {
  const map: Record<string, string> = {
    'ă': 'a', 'â': 'a', 'î': 'i', 'ș': 's', 'ț': 't',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo', 'ж': 'zh',
    'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'н': 'n', 'о': 'o',
    'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'h', 'ц': 'ts',
    'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
  };
  const transliterated = value.split('').map(char => map[char.toLowerCase()] || char).join('');
  return transliterated.toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^\w-]+/g, '').replace(/-{2,}/g, '-').replace(/^-+|-+$/g, '');
}

function brandSlug(brand: string): string {
  return brand.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

async function generateSitemap(): Promise<string> {
  const now = new Date().toISOString().split('T')[0];
  const urls: string[] = [];

  const addUrl = (path: string, changefreq: string, priority: string) => {
    const entries: string[] = [];
    for (const lang of LANGUAGES) {
      const loc = `${SITE_URL}/${lang}${path}`;
      const alternates = LANGUAGES.map(
        l => `<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(`${SITE_URL}/${l}${path}`)}" />`
      ).join('');
      const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/ro${path}`)}" />`;
      entries.push(`<url><loc>${escapeXml(loc)}</loc><lastmod>${now}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${alternates}${xDefault}</url>`);
    }
    urls.push(...entries);
  };

  // Static pages
  const staticPages = [
    { path: '', changefreq: 'daily', priority: '1.0' },
    { path: '/about-the-secret-room', changefreq: 'monthly', priority: '0.6' },
    { path: '/contacts', changefreq: 'monthly', priority: '0.5' },
    { path: '/delivery-terms', changefreq: 'monthly', priority: '0.5' },
    { path: '/brands', changefreq: 'weekly', priority: '0.7' },
    { path: '/catalog/vs', changefreq: 'daily', priority: '0.9' },
    { path: '/catalog/bb', changefreq: 'daily', priority: '0.9' },
    { path: '/catalog/bestsellers', changefreq: 'daily', priority: '0.8' },
    { path: '/catalog/new-arrivals', changefreq: 'daily', priority: '0.8' },
    { path: '/catalog/sales', changefreq: 'daily', priority: '0.8' },
  ];

  for (const page of staticPages) {
    addUrl(page.path, page.changefreq, page.priority);
  }

  // Dynamic: products
  try {
    const productsRes = await fetch(`${API_BASE}products/all`);
    if (productsRes.ok) {
      const products: any[] = await productsRes.json();
      for (const product of products) {
        const slug = slugify(product.name || '');
        addUrl(`/product/${product.id}/${slug}`, 'weekly', '0.8');
      }
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch products', e);
  }

  // Dynamic: categories
  try {
    const categoriesRes = await fetch(`${API_BASE}web-categories/hierarchy/active`);
    if (categoriesRes.ok) {
      const categories: any[] = await categoriesRes.json();
      const flatCategories = categories.flatMap((cat: any) => [cat, ...(cat.children || [])]);
      for (const cat of flatCategories) {
        const catSlug = cat.slug || slugify(cat.name || '');
        addUrl(`/catalog/${catSlug}`, 'weekly', '0.7');
      }
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch categories', e);
  }

  // Dynamic: brands
  try {
    const brandsRes = await fetch(`${API_BASE}products/brands`);
    if (brandsRes.ok) {
      const brands: any[] = await brandsRes.json();
      for (const brand of brands) {
        const slug = brandSlug(brand.brand || '');
        addUrl(`/catalog/brand/${slug}`, 'weekly', '0.7');
      }
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch brands', e);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>`;
}

app.get('/sitemap.xml', async (req, res) => {
  try {
    if (sitemapCache && Date.now() - sitemapCache.timestamp < SITEMAP_TTL) {
      res.set('Content-Type', 'application/xml');
      res.send(sitemapCache.xml);
      return;
    }
    const xml = await generateSitemap();
    sitemapCache = { xml, timestamp: Date.now() };
    res.set('Content-Type', 'application/xml');
    res.send(xml);
  } catch (e) {
    console.error('Sitemap generation error:', e);
    res.status(500).send('Error generating sitemap');
  }
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(join(browserDistFolder, 'robots.txt'));
});

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
