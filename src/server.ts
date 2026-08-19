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
 * 301 redirect: www.secretroom.md → secretroom.md (canonical domain consolidation)
 */
app.use((req, res, next) => {
  if (req.hostname === 'www.secretroom.md') {
    res.redirect(301, `https://secretroom.md${req.originalUrl}`);
    return;
  }
  next();
});

/**
 * Block search engine indexing on non-production domains (e.g. sr.solterprise.com)
 */
app.use((req, res, next) => {
  const host = req.hostname;
  if (host && !host.includes('secretroom.md')) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  }
  next();
});

/**
 * Remove trailing slashes (301 redirect) to avoid duplicate URLs.
 */
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

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

const API_BASE = process.env['SSR_API_URL'] || 'https://api.secretroom.md/api/';
const SITE_URL = 'https://secretroom.md';
const LANGUAGES = ['ro', 'ru'];

let sitemapCache: { xml: string; timestamp: number } | null = null;
const SITEMAP_TTL = 21600000; // 6 hours

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

function categorySlug(cat: any, lang: string): string {
  const name = lang === 'ro' ? cat.nameRo : cat.nameRu;
  return slugify(name || cat.name || '');
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Category cache for 301 redirect middleware
let redirectCategoriesCache: { data: any[]; ts: number } | null = null;
const REDIRECT_CATEGORIES_TTL = 3600000; // 1 hour

async function getCachedCategories(): Promise<any[]> {
  if (redirectCategoriesCache && Date.now() - redirectCategoriesCache.ts < REDIRECT_CATEGORIES_TTL) {
    return redirectCategoriesCache.data;
  }
  try {
    const res = await fetch(`${API_BASE}web-categories/hierarchy/active`);
    if (!res.ok) return redirectCategoriesCache?.data || [];
    const categories: any[] = await res.json();
    const flat = categories.flatMap((c: any) => [c, ...(c.children || [])]);
    redirectCategoriesCache = { data: flat, ts: Date.now() };
    return flat;
  } catch {
    return redirectCategoriesCache?.data || [];
  }
}

async function generateSitemap(): Promise<string> {
  const now = new Date().toISOString().split('T')[0];
  const urls: string[] = [];

  // Бэкенд отдаёт updatedAt массивом [yyyy, M, d, ...] (Jackson без JavaTimeModule),
  // но может отдать и ISO-строку. Ни один формат не должен ронять генерацию sitemap.
  const toLastmod = (value: unknown, fallback: string): string => {
    try {
      if (Array.isArray(value) && value.length >= 3) {
        const [y, m, d] = value as number[];
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
      if (typeof value === 'string' && value.length >= 10) {
        return value.split('T')[0];
      }
      if (typeof value === 'number') {
        return new Date(value).toISOString().split('T')[0];
      }
    } catch {
      // формат неизвестен — ниже вернём fallback
    }
    return fallback;
  };

  const addUrl = (path: string, changefreq: string, priority: string, lastmod: string = now) => {
    const entries: string[] = [];
    for (const lang of LANGUAGES) {
      const loc = `${SITE_URL}/${lang}${path}`;
      const alternates = LANGUAGES.map(
        l => `<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(`${SITE_URL}/${l}${path}`)}" />`
      ).join('');
      const xDefault = `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/ro${path}`)}" />`;
      entries.push(`<url><loc>${escapeXml(loc)}</loc><lastmod>${lastmod}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority>${alternates}${xDefault}</url>`);
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

  // Dynamic: products (lightweight sitemap endpoint, no stock filter)
  try {
    const productsRes = await fetch(`${API_BASE}products/sitemap`);
    if (!productsRes.ok) {
      console.error(`Sitemap: products endpoint returned ${productsRes.status}`);
    } else {
      const products: any[] = await productsRes.json();
      if (!products.length) {
        console.error('Sitemap: products endpoint returned an empty list');
      }
      for (const product of products) {
        const slug = slugify(product.name || product.nameRo || '');
        addUrl(`/product/${product.appId}/${slug}`, 'weekly', '0.8', toLastmod(product.updatedAt, now));
      }
      console.log(`Sitemap: ${products.length} products added`);
    }
  } catch (e) {
    console.error('Sitemap: failed to fetch products', e);
  }

  // Dynamic: categories (language-aware slugs)
  try {
    const categoriesRes = await fetch(`${API_BASE}web-categories/hierarchy/active`);
    if (categoriesRes.ok) {
      const categories: any[] = await categoriesRes.json();
      const flatCategories = categories.flatMap((cat: any) => [cat, ...(cat.children || [])]);
      for (const cat of flatCategories) {
        const roSlug = categorySlug(cat, 'ro');
        const ruSlug = categorySlug(cat, 'ru');
        const roLoc = `${SITE_URL}/ro/catalog/${roSlug}`;
        const ruLoc = `${SITE_URL}/ru/catalog/${ruSlug}`;
        const alternates = `<xhtml:link rel="alternate" hreflang="ro" href="${escapeXml(roLoc)}" />`
          + `<xhtml:link rel="alternate" hreflang="ru" href="${escapeXml(ruLoc)}" />`
          + `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(roLoc)}" />`;
        urls.push(`<url><loc>${escapeXml(roLoc)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority>${alternates}</url>`);
        urls.push(`<url><loc>${escapeXml(ruLoc)}</loc><lastmod>${now}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority>${alternates}</url>`);
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
  const host = req.hostname;
  if (host && !host.includes('secretroom.md')) {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
    return;
  }
  res.sendFile(join(browserDistFolder, 'robots.txt'));
});

/**
 * Permanent redirect: root → /ro (instead of Angular's 302)
 */
app.get('/', (req, res) => {
  res.redirect(301, '/ro');
});

/**
 * 301 redirects from old product URLs (legacy site) to new format.
 * Old: /vs/product-view/ID or /bb/product-view/ID
 * New: /ro/product/ID/slug
 */
app.get(['/vs/product-view/:id', '/bb/product-view/:id'], async (req, res) => {
  const appId = req.params['id'];
  const brand = req.path.startsWith('/vs') ? 'vs' : 'bb';

  try {
    const apiRes = await fetch(`${API_BASE}products/findProduct/${appId}`);
    if (apiRes.ok) {
      const product: any = await apiRes.json();
      const slug = slugify(product.name || '');
      res.redirect(301, `/ro/product/${appId}/${slug}`);
      return;
    }
  } catch { /* fallback below */ }

  res.redirect(301, `/ro/catalog/${brand}`);
});

/**
 * 301 redirects for legacy category URLs.
 * Old: /vs/category/ID or /bb/category/ID
 * New: /ro/catalog/vs or /ro/catalog/bb (brand page)
 */
app.get(['/vs/category/:id', '/bb/category/:id'], (req, res) => {
  const brand = req.path.startsWith('/vs') ? 'vs' : 'bb';
  res.redirect(301, `/ro/catalog/${brand}`);
});

/**
 * 301 redirects for legacy brand root and "all products" pages.
 */
app.get('/vs', (_req, res) => res.redirect(301, '/ro/catalog/vs'));
app.get('/bb', (_req, res) => res.redirect(301, '/ro/catalog/bb'));
app.get('/vs/all-vs-products', (_req, res) => res.redirect(301, '/ro/catalog/vs'));
app.get('/bb/all-bb-products', (_req, res) => res.redirect(301, '/ro/catalog/bb'));

/**
 * 301 redirects for legacy pages without language prefix.
 */
app.get('/contacts', (_req, res) => res.redirect(301, '/ro/contacts'));
app.get('/about-us', (_req, res) => res.redirect(301, '/ro/about-the-secret-room'));
app.get('/shipping', (_req, res) => res.redirect(301, '/ro/shipping'));
app.get('/delivery-terms', (_req, res) => res.redirect(301, '/ro/delivery-terms'));

/**
 * 301 redirect: wrong-language category slug → correct slug.
 * e.g. /ro/catalog/trusy → /ro/catalog/chiloti
 */
const STATIC_CATALOG_TAGS = new Set(['vs', 'bb', 'bestsellers', 'new-arrivals', 'sales']);

app.get('/:lang/catalog/:slug', async (req, res, next) => {
  const { lang, slug: urlSlug } = req.params;
  if (!['ro', 'ru'].includes(lang) || STATIC_CATALOG_TAGS.has(urlSlug)) return next();

  try {
    const categories = await getCachedCategories();
    if (!categories.length) return next();

    const cat = categories.find((c: any) =>
      c.slug === urlSlug
      || slugify(c.name || '') === urlSlug
      || slugify(c.nameRo || '') === urlSlug
      || slugify(c.nameRu || '') === urlSlug
    );
    if (!cat) return next();

    const expectedSlug = categorySlug(cat, lang);
    if (expectedSlug && urlSlug !== expectedSlug) {
      res.redirect(301, `/${lang}/catalog/${expectedSlug}`);
      return;
    }
  } catch { /* fallback to Angular */ }
  next();
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
