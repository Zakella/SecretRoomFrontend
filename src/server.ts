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
 * SR-103: catalog pagination lives in ?page=N. Only an integer N >= 2 without leading zeros is a page
 * (same rule as src/app/@core/services/catalog-page.ts); page 1 is the clean URL.
 * page=1, 0, -2, abc, 02, an empty or repeated page → 301 to the same path without it.
 * Every redirect that lands on a catalog URL builds its query with catalogQuery(), so a junk page is dropped
 * in the same hop (no chain like /catalog/vs?page=1 → brand?page=1 → brand).
 */
const CATALOG_PATH = /^\/(ro|ru)\/catalog\//i;
const CATALOG_PAGE = /^[1-9]\d{0,8}$/;

function isPageParam(part: string): boolean {
  const key = part.split('=')[0];
  try {
    return decodeURIComponent(key) === 'page';
  } catch {
    return false;
  }
}

/** Query string ('?…' or '') of a catalog URL with a junk page parameter dropped; other parameters kept verbatim. */
function catalogQuery(originalUrl: string): string {
  const start = originalUrl.indexOf('?');
  if (start < 0) return '';
  const parts = originalUrl.slice(start + 1).split('&').filter(Boolean);
  const pages = parts.filter(isPageParam);
  const value = pages.length === 1 ? pages[0].slice(pages[0].indexOf('=') + 1) : '';
  const keepPage = pages.length === 1 && pages[0].includes('=') && CATALOG_PAGE.test(value) && value !== '1';
  const kept = keepPage ? parts : parts.filter(p => !isPageParam(p));
  return kept.length ? `?${kept.join('&')}` : '';
}

/** Query to carry over when redirecting to `targetPath`: catalog URLs get the page clean-up, others stay as is. */
function queryFor(targetPath: string, originalUrl: string, path: string): string {
  return CATALOG_PATH.test(targetPath) ? catalogQuery(originalUrl) : originalUrl.slice(path.length);
}

/**
 * SR-97: /{lang}/catalog/vs and /{lang}/catalog/bb duplicated the brand pages — glue them with 301.
 * Registered BEFORE the lowercase (SR-96) and trailing-slash middlewares on purpose: Express routing is non-strict and
 * case-insensitive, so /ro/catalog/vs/ and /RO/catalog/VS land here too and get ONE hop straight
 * to the final brand URL (no slash → brand chain). Query string is kept as is.
 */
const BRAND_PAGE_BY_LEGACY_TAG = new Map<string, string>([
  ['vs', '/catalog/brand/victorias-secret'],
  ['bb', '/catalog/brand/bath-and-body'],
]);

app.get('/:lang/catalog/:tag', (req, res, next) => {
  const lang = req.params['lang'].toLowerCase();
  const target = BRAND_PAGE_BY_LEGACY_TAG.get(req.params['tag'].toLowerCase());
  if (!LANGUAGES.includes(lang) || !target) return next();
  res.redirect(301, `/${lang}${target}${catalogQuery(req.originalUrl)}`);
});

/**
 * SR-96: адрес с заглавными буквами → 301 на lowercase, query сохраняется.
 * /RO/catalog/Sutiene/?a=1 → /ro/catalog/sutiene?a=1 — один хоп вместе со снятием слэша,
 * поэтому стоит ДО middleware слэша (иначе слэш и регистр дали бы цепочку из двух 301).
 *
 * Трогаем только страницы сайта — первый сегмент ro/ru в любом регистре. Поэтому мимо идут
 * /api, ассеты из browser dist и public/ (favicon.ico, stores/… — регистр имён сохраняется),
 * sitemap, легаси /vs, /bb (их маршруты Express и так регистронезависимы) и чужие языки
 * (/EN/… → 404 без лишнего хопа). Плюс не трогаем не-GET/HEAD и файлы с расширением.
 * Percent-escape (%D0%B1) не считаем заглавными — иначе Cloudflare-нормализация зациклит редирект.
 * Карточку товара с языком в нижнем регистре оставляем слаг-middleware: он сам ведёт
 * на канонический слаг одним хопом. Номер заказа и поисковый запрос — регистр сохраняем.
 */
const CASE_SENSITIVE_SECTIONS = new Set(['order', 'order-success', 'search']);

function toLowercasePath(path: string): string {
  const lower = (part: string) => part.replace(/(%[0-9A-Fa-f]{2})|[^%]+/g, (m, esc) => esc ?? m.toLowerCase());
  const segments = path.split('/');
  if (segments.length > 3 && CASE_SENSITIVE_SECTIONS.has(lower(segments[2]))) {
    return [...segments.slice(0, 3).map(lower), ...segments.slice(3)].join('/');
  }
  return lower(path);
}

function redirectToLowercase(req: express.Request, res: express.Response, next: express.NextFunction): void {
  const path = req.path;
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (!/[A-Z]/.test(path.replace(/%[0-9A-Fa-f]{2}/g, ''))) return next();
  if (!/^\/(ro|ru)(\/|$)/i.test(path)) return next();
  const segments = path.split('/');
  if (/\.[A-Za-z0-9]+$/.test(segments[segments.length - 1])) return next();
  if (/^\/(ro|ru)\/product\/\d+\//.test(path)) return next();

  let target = toLowercasePath(path);
  if (target !== '/' && target.endsWith('/')) target = target.replace(/\/+$/, '') || '/';
  if (target === path) return next();
  res.redirect(301, target + queryFor(target, req.originalUrl, req.path));
}

app.use(redirectToLowercase);

/**
 * Remove trailing slashes (301 redirect) to avoid duplicate URLs.
 */
app.use((req, res, next) => {
  if (req.path !== '/' && req.path.endsWith('/')) {
    const target = req.path.slice(0, -1);
    const query = CATALOG_PATH.test(target) ? catalogQuery(req.url) : req.url.slice(req.path.length);
    res.redirect(301, target + query);
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

/**
 * Sitemap разбит на секции: /sitemap.xml — индекс, секции лежат по /sitemap-<section>.xml.
 * Так в Search Console видно покрытие отдельно по товарам, категориям, брендам и статике:
 * если товары снова перестанут попадать в карту (как было с updatedAt-массивом), это будет
 * видно сразу по счётчику своей секции, а не размажется по общему числу URL.
 * changefreq и priority не выводим (SR-101): Google их игнорирует.
 */
type SitemapSection = 'static' | 'categories' | 'brands' | 'products';
const SITEMAP_SECTIONS: SitemapSection[] = ['static', 'categories', 'brands', 'products'];
const sitemapCache = new Map<SitemapSection, { xml: string; lastmod: string | null; timestamp: number }>();
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

/**
 * Кэш канонических слагов товаров: appId -> slug.
 *
 * В индексе 20 товаров живут в двух вариантах: старый percent-encoded адрес
 * (/ro/product/3739/%20BEAUTY%20LIGHT%20WAND%20PINKGASM) и человекочитаемый kebab-слаг.
 * Оба отдавали 200 и делили вес. Слаг в URL декоративный — товар резолвится по числовому id
 * (см. product.resolver.ts), поэтому любой неканонический слаг можно смело 301-редиректить.
 */
let productSlugCache: { map: Map<string, string>; ts: number } | null = null;
let productSlugInflight: Promise<Map<string, string>> | null = null;
const PRODUCT_SLUG_TTL = 21600000; // 6 hours

function refreshProductSlugs(): Promise<Map<string, string>> {
  if (!productSlugInflight) {
    productSlugInflight = (async () => {
      const res = await fetch(`${API_BASE}products/sitemap`);
      if (!res.ok) throw new Error(`products/sitemap returned ${res.status}`);
      const products: any[] = await res.json();
      const map = new Map<string, string>();
      for (const product of products) {
        const slug = slugify(product.name || product.nameRo || '');
        if (product.appId != null && slug) map.set(String(product.appId), slug);
      }
      productSlugCache = { map, ts: Date.now() };
      return map;
    })()
      .catch((e) => {
        console.error('Product slugs: failed to refresh', e);
        return productSlugCache?.map ?? new Map<string, string>();
      })
      .finally(() => { productSlugInflight = null; });
  }
  return productSlugInflight;
}

/**
 * Возвращает кэш, если он свежий. Если протух или пуст — запускает обновление в фоне
 * и отдаёт то, что есть (null на холодном старте), чтобы не блокировать рендер товара.
 */
function getProductSlugs(): Map<string, string> | null {
  const fresh = productSlugCache && Date.now() - productSlugCache.ts < PRODUCT_SLUG_TTL;
  if (!fresh) void refreshProductSlugs();
  return productSlugCache?.map ?? null;
}

/**
 * lastmod из даты бэкенда (у товаров — contentUpdatedAt). Бэкенд отдаёт её массивом [yyyy, M, d, ...]
 * (Jackson без JavaTimeModule), но может отдать и ISO-строку. Ни один формат не должен ронять генерацию sitemap.
 * Дату определить не удалось → null: тег не выводим вовсе, это честнее подстановки «сегодня».
 */
function toLastmod(value: unknown): string | null {
  try {
    if (Array.isArray(value) && value.length >= 3) {
      const [y, m, d] = value as number[];
      if ([y, m, d].every(n => Number.isFinite(n))) {
        return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      }
    }
    if (typeof value === 'string' && value.length >= 10) {
      return value.slice(0, 10);
    }
    if (typeof value === 'number') {
      return new Date(value).toISOString().split('T')[0];
    }
  } catch {
    // формат неизвестен — ниже вернём null
  }
  return null;
}

function lastmodTag(lastmod: string | null): string {
  return lastmod ? `<lastmod>${lastmod}</lastmod>` : '';
}

/** xmlns:image объявлен во всех секциях (без вреда), image:image есть только у товаров. */
function urlset(urls: string[]): string {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>`;
}

/** SR-101: фото товара для image-sitemap — не больше 3 на URL, пустые и не-строки пропускаем. */
const MAX_SITEMAP_IMAGES = 3;

function sitemapImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((url): url is string => typeof url === 'string' && url.trim() !== '')
    .slice(0, MAX_SITEMAP_IMAGES);
}

/** Пара ro/ru URL с перекрёстными hreflang. lastmod = null → тег не выводится; images → image:image в каждом языке. */
function langUrls(path: string, lastmod: string | null = null, images: string[] = []): string[] {
  const alternates = LANGUAGES
    .map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${escapeXml(`${SITE_URL}/${l}${path}`)}" />`)
    .join('')
    + `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(`${SITE_URL}/ro${path}`)}" />`;
  const imageTags = images.map(url => `<image:image><image:loc>${escapeXml(url)}</image:loc></image:image>`).join('');

  return LANGUAGES.map(lang =>
    `<url><loc>${escapeXml(`${SITE_URL}/${lang}${path}`)}</loc>${lastmodTag(lastmod)}${alternates}${imageTags}</url>`
  );
}

interface SitemapPart { xml: string; lastmod: string | null }

const STATIC_PAGES: { path: string }[] = [
  { path: '' },
  { path: '/about-the-secret-room' },
  { path: '/contacts' },
  { path: '/delivery-terms' },
  { path: '/shipping' },
  { path: '/brands' },
  { path: '/catalog/bestsellers' },
  { path: '/catalog/new-arrivals' },
  { path: '/catalog/sales' },
];

/**
 * Статика: даты изменения взять неоткуда — страницы собираются из шаблонов Angular.
 * lastmod не выводим (спецификация sitemap его не требует).
 */
function generateStaticSitemap(): SitemapPart {
  const urls = STATIC_PAGES.flatMap(page => langUrls(page.path));
  return { xml: urlset(urls), lastmod: null };
}

/**
 * Товары — единственная секция с настоящим lastmod: contentUpdatedAt из products/sitemap (дата реального
 * изменения содержимого). updatedAt не берём — он врёт (меняется у всех товаров разом). Нет contentUpdatedAt
 * (null или старый бэкенд без поля) → тега нет. lastmod секции в индексе — самый свежий contentUpdatedAt или null.
 * imageUrls → image:image (у старого бэкенда поля нет — тегов нет).
 */
async function generateProductsSitemap(): Promise<SitemapPart> {
  const res = await fetch(`${API_BASE}products/sitemap`);
  if (!res.ok) throw new Error(`products/sitemap returned ${res.status}`);
  const products: any[] = await res.json();
  // Пустой ответ — не повод публиковать пустую секцию: пусть отдаётся прошлая версия.
  if (!products.length) throw new Error('products/sitemap returned an empty list');

  const urls: string[] = [];
  let newest: string | null = null;
  for (const product of products) {
    const slug = slugify(product.name || product.nameRo || '');
    const lastmod = toLastmod(product.contentUpdatedAt);
    if (lastmod && (!newest || lastmod > newest)) newest = lastmod;
    urls.push(...langUrls(`/product/${product.appId}/${slug}`, lastmod, sitemapImages(product.imageUrls)));
  }
  console.log(`Sitemap: ${products.length} products added`);
  return { xml: urlset(urls), lastmod: newest };
}

/**
 * Категории: слаг зависит от языка, поэтому URL собираем вручную, а не через langUrls.
 * lastmod нет — /web-categories/hierarchy/active не отдаёт дату изменения, а подставлять
 * текущую дату значит помечать все категории «изменёнными» при каждой перегенерации.
 */
async function generateCategoriesSitemap(): Promise<SitemapPart> {
  const res = await fetch(`${API_BASE}web-categories/hierarchy/active`);
  if (!res.ok) throw new Error(`web-categories/hierarchy/active returned ${res.status}`);
  const categories: any[] = await res.json();
  const flatCategories = categories.flatMap((cat: any) => [cat, ...(cat.children || [])]);

  const urls: string[] = [];
  for (const cat of flatCategories) {
    const roLoc = `${SITE_URL}/ro/catalog/${categorySlug(cat, 'ro')}`;
    const ruLoc = `${SITE_URL}/ru/catalog/${categorySlug(cat, 'ru')}`;
    const alternates = `<xhtml:link rel="alternate" hreflang="ro" href="${escapeXml(roLoc)}" />`
      + `<xhtml:link rel="alternate" hreflang="ru" href="${escapeXml(ruLoc)}" />`
      + `<xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(roLoc)}" />`;
    for (const loc of [roLoc, ruLoc]) {
      urls.push(`<url><loc>${escapeXml(loc)}</loc>${alternates}</url>`);
    }
  }
  return { xml: urlset(urls), lastmod: null };
}

/** Бренды: products/brands отдаёт только brand + brandAlias, даты изменения нет. */
async function generateBrandsSitemap(): Promise<SitemapPart> {
  const res = await fetch(`${API_BASE}products/brands`);
  if (!res.ok) throw new Error(`products/brands returned ${res.status}`);
  const brands: any[] = await res.json();
  const urls = brands.flatMap((brand: any) =>
    langUrls(`/catalog/brand/${brandSlug(brand.brand || '')}`)
  );
  return { xml: urlset(urls), lastmod: null };
}

const SITEMAP_GENERATORS: Record<SitemapSection, () => SitemapPart | Promise<SitemapPart>> = {
  static: generateStaticSitemap,
  categories: generateCategoriesSitemap,
  brands: generateBrandsSitemap,
  products: generateProductsSitemap,
};

async function getSitemapSection(section: SitemapSection): Promise<SitemapPart> {
  const cached = sitemapCache.get(section);
  if (cached && Date.now() - cached.timestamp < SITEMAP_TTL) return cached;

  try {
    const part = await SITEMAP_GENERATORS[section]();
    sitemapCache.set(section, { ...part, timestamp: Date.now() });
    return part;
  } catch (e) {
    console.error(`Sitemap: section "${section}" failed`, e);
    // Протухшая, но валидная секция лучше пустой. Кэш не перезаписываем — retry на следующем запросе.
    if (cached) return cached;
    return { xml: urlset([]), lastmod: null };
  }
}

async function generateSitemapIndex(): Promise<string> {
  const entries = await Promise.all(
    SITEMAP_SECTIONS.map(async section => {
      const { lastmod } = await getSitemapSection(section);
      return `<sitemap><loc>${SITE_URL}/sitemap-${section}.xml</loc>${lastmodTag(lastmod)}</sitemap>`;
    })
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</sitemapindex>`;
}

app.get('/sitemap.xml', async (_req, res) => {
  try {
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(await generateSitemapIndex());
  } catch (e) {
    console.error('Sitemap index generation error:', e);
    res.status(500).send('Error generating sitemap');
  }
});

for (const section of SITEMAP_SECTIONS) {
  app.get(`/sitemap-${section}.xml`, async (_req, res) => {
    try {
      const { xml } = await getSitemapSection(section);
      res.set('Content-Type', 'application/xml; charset=utf-8');
      res.send(xml);
    } catch (e) {
      console.error(`Sitemap section "${section}" error:`, e);
      res.status(500).send('Error generating sitemap');
    }
  });
}

app.get('/robots.txt', (req, res) => {
  const host = req.hostname;
  if (host && !host.includes('secretroom.md')) {
    res.type('text/plain').send('User-agent: *\nDisallow: /\n');
    return;
  }
  res.sendFile(join(browserDistFolder, 'robots.txt'));
});

/**
 * SR-96: /index.html → 301 /ro. Без этого Angular SSR сам срезал /index.html до «/»,
 * а роутерный редирект '' → 'ro' отдавал 302. /ro/index.html, /ru/index.html — 301 на язык.
 */
app.get(/^\/(?:(ro|ru)\/)?index\.html$/, (req, res) => {
  // Цель — только /ro или /ru: адрес из пути не берём, иначе //evil.com/index.html дал бы open redirect.
  res.redirect(301, `/${req.params[0] ?? 'ro'}` + req.originalUrl.slice(req.path.length));
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

  res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get(brand)}`);
});

/**
 * SR-96: легаси /:lang/product-detail/:id → 301 на /:lang/product/:id/:slug одним хопом
 * (слаг канонический, из того же кэша, что у слаг-middleware, — второго 301 не будет).
 * Раньше Angular отвечал 302 на битый адрес /ro/product-detail/product/:id/details.
 * id неизвестен → дальше в Angular (404); кэш слагов пуст (сбой API) → 503.
 */
app.get('/:lang/product-detail/:id', async (req, res, next) => {
  const { lang, id } = req.params;
  if (!LANGUAGES.includes(lang) || !/^\d+$/.test(id)) return next();

  try {
    const slugs = getProductSlugs() ?? await refreshProductSlugs();
    if (slugs.size === 0) {
      // кэш слагов пуст (API лежит на холодном старте) — «не знаем», а не «нет такого товара»
      res.set({ 'Retry-After': '120', 'Cache-Control': 'no-store' }).status(503).send('Service Unavailable');
      return;
    }
    const slug = slugs.get(id);
    if (!slug) return next();

    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, `/${lang}/product/${id}/${slug}${query}`);
    return;
  } catch { /* fallback to Angular */ }
  next();
});

/**
 * 301 redirects for legacy category URLs.
 * Old: /vs/category/ID or /bb/category/ID
 * New: /ro/catalog/brand/victorias-secret or /ro/catalog/brand/bath-and-body (final URL, one hop)
 */
app.get(['/vs/category/:id', '/bb/category/:id'], (req, res) => {
  const brand = req.path.startsWith('/vs') ? 'vs' : 'bb';
  res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get(brand)}`);
});

/**
 * 301 redirects for legacy brand root and "all products" pages — straight to the brand page.
 */
app.get('/vs', (_req, res) => res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get('vs')}`));
app.get('/bb', (_req, res) => res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get('bb')}`));
app.get('/vs/all-vs-products', (_req, res) => res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get('vs')}`));
app.get('/bb/all-bb-products', (_req, res) => res.redirect(301, `/ro${BRAND_PAGE_BY_LEGACY_TAG.get('bb')}`));

/**
 * 301 redirects for legacy pages without language prefix.
 */
app.get('/contacts', (_req, res) => res.redirect(301, '/ro/contacts'));
app.get('/about-us', (_req, res) => res.redirect(301, '/ro/about-the-secret-room'));
app.get('/shipping', (_req, res) => res.redirect(301, '/ro/shipping'));
app.get('/delivery-terms', (_req, res) => res.redirect(301, '/ro/delivery-terms'));

/**
 * 301 redirect: неканонический слаг товара → канонический.
 * /ro/product/3739/%20BEAUTY%20LIGHT%20WAND%20PINKGASM → /ro/product/3739/beauty-light-wand-pinkgasm
 *
 * Покрывает и legacy percent-encoded адреса, и товары, у которых слаг сменился
 * после переименования. Товар резолвится по id, слаг в URL — декоративный.
 */
app.get('/:lang/product/:id/:slug', async (req, res, next) => {
  const { lang, id, slug } = req.params;
  if (!LANGUAGES.includes(lang) || !/^\d+$/.test(id)) return next();

  // «Грязный» слаг — заведомо неканоничен (пробелы, верхний регистр, не-slug символы).
  const isDirty = slug !== slugify(slug);

  try {
    let slugs = getProductSlugs();
    // Ради грязных адресов (их мало, и это именно они сидят в индексе дважды)
    // можно подождать прогрева кэша; чистые слаги пропускаем без блокировки.
    if (!slugs && isDirty) slugs = await refreshProductSlugs();
    if (!slugs) return next();

    const canonical = slugs.get(id);
    if (!canonical || canonical === slug) return next();

    const query = req.originalUrl.slice(req.path.length);
    res.redirect(301, `/${lang}/product/${id}/${canonical}${query}`);
    return;
  } catch { /* fallback to Angular */ }
  next();
});

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
      // SR-103: keep the query (?page=N) — the wrong-language slug of page 3 is page 3 of the right one
      res.redirect(301, `/${lang}/catalog/${expectedSlug}${catalogQuery(req.originalUrl)}`);
      return;
    }
  } catch { /* fallback to Angular */ }
  next();
});

/**
 * SR-103: junk ?page on a catalog URL (page=1, 0, -2, abc, 02…) → one 301 to the same path without it,
 * other query parameters kept. A valid page=N (N >= 2) goes on to SSR; a page past the last one is a 404 there.
 * Registered AFTER every other catalog redirect (vs/bb, lowercase, trailing slash, wrong-language slug): those build
 * their query with catalogQuery() and drop a junk page in the same hop, so only a URL that is otherwise final lands here.
 */
app.use((req, res, next) => {
  if ((req.method !== 'GET' && req.method !== 'HEAD') || !CATALOG_PATH.test(req.path)) return next();
  const start = req.originalUrl.indexOf('?');
  if (start < 0 || !req.originalUrl.slice(start + 1).split('&').some(isPageParam)) return next();
  const query = catalogQuery(req.originalUrl);
  if (query.slice(1).split('&').some(isPageParam)) return next();
  res.redirect(301, req.path + query);
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
