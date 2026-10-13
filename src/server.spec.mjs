/**
 * Тесты SSR-редиректов и кэша слагов из src/server.ts.
 *
 * Karma здесь не годится: server.ts тянет express и node-билтины, а karma-бандл собирается
 * под браузер (esbuild падает на "Could not resolve node:path"). Поэтому спека гоняет
 * собранный SSR-бандл в node встроенным раннером (node --test, без новых зависимостей) —
 * то есть ровно тот артефакт, который уезжает на прод.
 *
 *   npx ng build && node --test src/server.spec.mjs
 */
import assert from 'node:assert/strict';
import http from 'node:http';
import {existsSync} from 'node:fs';
import {after, afterEach, before, beforeEach, describe, it} from 'node:test';

const BUNDLE = new URL('../dist/secret-room/server/server.mjs', import.meta.url);

const PRODUCTS = [
  // updatedAt в двух форматах, которые реально приходят с бэка: массив Jackson и ISO-строка.
  {appId: 3739, name: ' BEAUTY LIGHT WAND PINKGASM', updatedAt: [2025, 3, 7, 12, 30]},
  {appId: 12, name: 'Bombshell Eau de Parfum', updatedAt: '2024-11-02T08:15:00'},
];
/** Самая свежая дата из PRODUCTS — её индекс обязан показать у секции товаров. */
const NEWEST_PRODUCT_LASTMOD = '2025-03-07';

const CATEGORIES = [
  {
    nameRo: 'Lenjerie', nameRu: 'Белье',
    children: [{nameRo: 'Sutiene', nameRu: 'Бюстгальтеры'}],
  },
];
const BRANDS = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'BathAndBody', brandAlias: 'Bath & Body Works'},
];

/** Сколько <url> обязана отдать каждая секция на этих фикстурах (по 2 языка на адрес). */
const EXPECTED_SECTION_URLS = {
  static: 16,      // 8 статических страниц (vs/bb склеены 301 на brand-URL, SR-97)
  categories: 4,   // родитель + ребёнок
  brands: 4,       // 2 бренда
  products: 4,     // 2 товара
};
const EXPECTED_TOTAL_URLS = Object.values(EXPECTED_SECTION_URLS).reduce((a, b) => a + b, 0);

const realFetch = globalThis.fetch;
const realNow = Date.now;

let clockOffset = 0;
let sitemapCalls = 0;
/** Позволяет тесту придержать ответ апстрима и поймать два запроса в одном окне. */
let sitemapGate = null;
let sitemapFails = false;
/** Апстрим жив, но отдаёт пустой список — секция не должна публиковать пустоту. */
let sitemapEmpty = false;
let categoriesEmpty = false;

/** SR-103: bestsellers listing of 30 products — API page 0 holds 24, page 1 the last 6, further pages are empty. */
const BESTSELLERS_TOTAL = 30;
function bestsellersPage(params) {
  const page = Number(params.get('page'));
  const size = Number(params.get('size'));
  const from = page * size;
  const count = Math.max(0, Math.min(size, BESTSELLERS_TOTAL - from));
  const content = Array.from({length: count}, (_, i) => ({
    id: String(1000 + from + i), name: `Bestseller ${from + i}`, price: 100, imageURL: null, size: null,
  }));
  return {content, totalElements: BESTSELLERS_TOTAL, pageable: {pageNumber: page, pageSize: size}};
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {'content-type': 'application/json'},
  });
}

before(() => {
  assert.ok(
    existsSync(BUNDLE),
    `SSR-бандл не собран: ${BUNDLE.pathname}. Сначала выполните "npx ng build".`,
  );

  Date.now = () => realNow.call(Date) + clockOffset;

  globalThis.fetch = async (input, init) => {
    const url = String(input);
    // запросы самой спеки к тестовому серверу — мимо заглушки
    if (url.startsWith('http://127.0.0.1:')) return realFetch(input, init);

    if (url.endsWith('products/sitemap')) {
      sitemapCalls++;
      if (sitemapGate) await sitemapGate;
      if (sitemapFails) return new Response('upstream down', {status: 503});
      return json(sitemapEmpty ? [] : PRODUCTS);
    }
    if (url.includes('web-categories/hierarchy/active')) return json(categoriesEmpty ? [] : CATEGORIES);
    if (url.endsWith('products/brands')) return json(BRANDS);
    if (url.includes('products/bestsellers?')) return json(bestsellersPage(new URL(url).searchParams));
    // реальный API sales/bestsellers отвечает на пустую страницу 204 без тела
    if (url.includes('products/sales?') && new URL(url).searchParams.get('page') !== '0') {
      return new Response(null, {status: 204});
    }
    return json([]);
  };
});

after(() => {
  globalThis.fetch = realFetch;
  Date.now = realNow;
});

let instances = 0;
let server = null;
let port = 0;

/** Свежий инстанс server.ts на каждый тест: module-level кэш слагов не течёт между кейсами. */
async function startServer() {
  const mod = await import(`${BUNDLE.href}?instance=${++instances}`);
  server = http.createServer(mod.reqHandler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
}

function get(path) {
  return realFetch(`http://127.0.0.1:${port}${path}`, {redirect: 'manual'});
}

async function getText(path) {
  const res = await get(path);
  return {res, body: await res.text()};
}

const countUrls = xml => (xml.match(/<url>/g) || []).length;
const lastmods = xml => [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(m => m[1]);
const today = () => new Date(realNow.call(Date)).toISOString().slice(0, 10);

/** og-теги отрендеренной страницы: property -> content. */
function ogTags(html) {
  const tags = {};
  for (const m of html.matchAll(/<meta property="(og:[^"]+)" content="([^"]*)"/g)) tags[m[1]] = m[2];
  return tags;
}

/** Ждёт, пока фоновое обновление кэша дойдёт до апстрима. */
async function waitForSitemapCalls(expected, timeoutMs = 2000) {
  const deadline = realNow.call(Date) + timeoutMs;
  while (sitemapCalls < expected && realNow.call(Date) < deadline) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return sitemapCalls;
}

const DIRTY = '/ro/product/3739/%20BEAUTY%20LIGHT%20WAND%20PINKGASM';
const CANONICAL = '/ro/product/3739/beauty-light-wand-pinkgasm';

describe('server.ts — канонический слаг товара', () => {
  beforeEach(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('редиректит грязный слаг на канонический', async () => {
    const res = await get(DIRTY);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), CANONICAL);
  });

  it('сохраняет query-параметры при редиректе', async () => {
    const res = await get(`${DIRTY}?variant=88&utm_source=google`);
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), `${CANONICAL}?variant=88&utm_source=google`);
  });

  it('не редиректит, если слаг уже канонический', async () => {
    // Кэш слагов прогреваем заранее: на холодном старте чистый слаг уходит в рендер,
    // не доходя до сравнения с каноническим, — и защита от петли осталась бы непроверенной.
    await get(DIRTY);

    const res = await get(CANONICAL);
    // Именно 200, а не «просто не 301»: канонический адрес обязан отдавать страницу,
    // иначе весь вес редиректов утекает в 404/500.
    assert.equal(res.status, 200, `канонический адрес отдал ${res.status}`);
    assert.equal(res.headers.get('location'), null, 'канонический адрес редиректит сам на себя');
  });

  it('не зацикливается: цель редиректа отдаётся без нового 301', async () => {
    const first = await get(DIRTY);
    assert.equal(first.status, 301);

    const second = await get(first.headers.get('location'));
    assert.equal(second.status, 200, 'цель редиректа не отдала страницу');
    assert.equal(second.headers.get('location'), null, 'канонический адрес редиректит сам на себя');
  });

  it('не зацикливается на цепочке: слеш в конце + грязный слаг сходятся к 200', async () => {
    // Слеш срезает одна миддлварь, слаг канонизирует другая — важно, что цепочка конечна.
    let path = `${DIRTY}/`;
    const seen = [];
    for (let hop = 0; hop < 5; hop++) {
      const res = await get(path);
      if (res.status !== 301) {
        assert.equal(res.status, 200, `цепочка закончилась статусом ${res.status}`);
        assert.ok(seen.length <= 3, `слишком длинная цепочка редиректов: ${seen.join(' -> ')}`);
        return;
      }
      const next = res.headers.get('location');
      assert.ok(!seen.includes(next), `петля редиректов: ${[...seen, next].join(' -> ')}`);
      seen.push(next);
      path = next;
    }
    assert.fail(`редиректы не сошлись: ${seen.join(' -> ')}`);
  });

  it('пропускает неизвестный id в обычный рендер', async () => {
    const res = await get('/ro/product/999999/whatever-slug');
    assert.notEqual(res.status, 301);
  });

  it('не трогает нечисловой id и не дёргает апстрим', async () => {
    const res = await get('/ro/product/abc/some-slug');
    assert.notEqual(res.status, 301);
    assert.equal(sitemapCalls, 0);
  });

  it('не трогает чужой языковой префикс', async () => {
    const res = await get('/en/product/3739/%20BEAUTY%20LIGHT%20WAND%20PINKGASM');
    assert.notEqual(res.status, 301);
    assert.equal(sitemapCalls, 0);
  });

  it('при ошибке апстрима отдаёт обычный рендер, а не 500', async () => {
    sitemapFails = true;
    const res = await get(DIRTY);
    assert.notEqual(res.status, 301);
    assert.ok(res.status < 500, `ожидали не 5xx, получили ${res.status}`);
  });
});

describe('server.ts — TTL кэша слагов', () => {
  beforeEach(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('внутри TTL отвечает из кэша, без похода в апстрим', async () => {
    await get(DIRTY);
    assert.equal(sitemapCalls, 1);

    clockOffset = 21600000 - 1000; // чуть меньше 6 часов
    const res = await get(DIRTY);

    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), CANONICAL);
    assert.equal(await waitForSitemapCalls(2, 300), 1);
  });

  it('после истечения TTL перезапрашивает слаги', async () => {
    await get(DIRTY);
    assert.equal(sitemapCalls, 1);

    clockOffset = 21600000 + 1000; // TTL истёк
    const res = await get(DIRTY);

    assert.equal(res.status, 301, 'протухший кэш всё ещё обслуживает запрос');
    assert.equal(await waitForSitemapCalls(2), 2);
  });
});

describe('server.ts — дедупликация одновременных запросов', () => {
  beforeEach(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('два одновременных запроса дают один поход в апстрим', async () => {
    let release;
    sitemapGate = new Promise(resolve => (release = resolve));

    const both = Promise.all([get(DIRTY), get(DIRTY)]);
    // даём обоим запросам дойти до прогрева кэша, пока апстрим придержан
    await new Promise(resolve => setTimeout(resolve, 150));
    release();

    const [first, second] = await both;
    assert.equal(first.status, 301);
    assert.equal(second.status, 301);
    assert.equal(first.headers.get('location'), CANONICAL);
    assert.equal(second.headers.get('location'), CANONICAL);
    assert.equal(sitemapCalls, 1);
  });
});


describe('server.ts — sitemap-индекс', () => {
  beforeEach(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('/sitemap.xml отдаёт 200 и XML-индекс со всеми четырьмя секциями', async () => {
    const {res, body} = await getText('/sitemap.xml');

    assert.equal(res.status, 200);
    assert.match(res.headers.get('content-type'), /xml/);
    assert.match(body, /^<\?xml version="1\.0" encoding="UTF-8"\?>/);
    assert.match(body, /<sitemapindex\b/);
    for (const section of ['static', 'categories', 'brands', 'products']) {
      assert.ok(
        body.includes(`<loc>https://secretroom.md/sitemap-${section}.xml</loc>`),
        `в индексе нет секции ${section}`,
      );
    }
    assert.equal((body.match(/<sitemap>/g) || []).length, 4);
  });

  it('суммарное число адресов по секциям не потерялось', async () => {
    let total = 0;
    for (const [section, expected] of Object.entries(EXPECTED_SECTION_URLS)) {
      const {res, body} = await getText(`/sitemap-${section}.xml`);
      assert.equal(res.status, 200, `секция ${section} отдала ${res.status}`);
      assert.match(res.headers.get('content-type'), /xml/);
      assert.match(body, /<urlset\b/);
      const count = countUrls(body);
      assert.equal(count, expected, `в секции ${section} ${count} адресов вместо ${expected}`);
      assert.ok(count > 0, `секция ${section} пуста`);
      total += count;
    }
    assert.equal(total, EXPECTED_TOTAL_URLS);
  });

  it('каждый товар попадает в секцию товаров обоими языками', async () => {
    const {body} = await getText('/sitemap-products.xml');
    for (const lang of ['ro', 'ru']) {
      assert.ok(body.includes(`<loc>https://secretroom.md/${lang}/product/3739/beauty-light-wand-pinkgasm</loc>`));
      assert.ok(body.includes(`<loc>https://secretroom.md/${lang}/product/12/bombshell-eau-de-parfum</loc>`));
    }
  });

  it('lastmod у товаров настоящий, а не сегодняшняя дата', async () => {
    const {body} = await getText('/sitemap-products.xml');
    const dates = lastmods(body);

    assert.equal(dates.length, EXPECTED_SECTION_URLS.products, 'lastmod есть не у всех товаров');
    // Обе формы updatedAt с бэка разобраны, а не подменены «сегодня».
    assert.deepEqual([...new Set(dates)].sort(), ['2024-11-02', '2025-03-07']);
    assert.ok(!dates.includes(today()), 'lastmod подставлен текущей датой');
  });

  it('у секций без реальной даты изменения lastmod не выводится', async () => {
    for (const section of ['static', 'categories', 'brands']) {
      const {body} = await getText(`/sitemap-${section}.xml`);
      assert.deepEqual(lastmods(body), [], `секция ${section} врёт про lastmod`);
    }
  });

  it('индекс показывает у товаров самую свежую дату и молчит про остальные секции', async () => {
    const {body} = await getText('/sitemap.xml');

    assert.equal(lastmods(body).length, 1, 'lastmod должен быть только у секции товаров');
    assert.match(
      body,
      new RegExp(`sitemap-products\\.xml</loc><lastmod>${NEWEST_PRODUCT_LASTMOD}</lastmod>`),
    );
  });
});

describe('server.ts — фолбэк секции sitemap при сбое апстрима', () => {
  beforeEach(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  afterEach(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('упавший апстрим — секция отдаёт прошлую закэшированную версию, а не пустой файл', async () => {
    const warm = await getText('/sitemap-products.xml');
    assert.equal(countUrls(warm.body), EXPECTED_SECTION_URLS.products);

    sitemapFails = true;
    clockOffset = 21600000 + 1000; // кэш протух, апстрим лежит

    const {res, body} = await getText('/sitemap-products.xml');
    assert.equal(res.status, 200, 'при сбое апстрима секция обязана отдавать 200');
    assert.equal(body, warm.body, 'отдана не прошлая версия секции');
    assert.equal(countUrls(body), EXPECTED_SECTION_URLS.products, 'секция схлопнулась в пустую');
  });

  it('пустой список товаров тоже не публикуется — остаётся прошлая версия', async () => {
    const warm = await getText('/sitemap-products.xml');

    sitemapEmpty = true;
    clockOffset = 21600000 + 1000;

    const {res, body} = await getText('/sitemap-products.xml');
    assert.equal(res.status, 200);
    assert.equal(body, warm.body, 'пустой ответ апстрима затёр секцию');
  });

  it('после починки апстрима секция снова обновляется', async () => {
    await getText('/sitemap-products.xml');

    sitemapFails = true;
    clockOffset = 21600000 + 1000;
    await getText('/sitemap-products.xml');

    sitemapFails = false;
    clockOffset = 43200000 + 1000;
    const {res, body} = await getText('/sitemap-products.xml');
    assert.equal(res.status, 200);
    assert.equal(countUrls(body), EXPECTED_SECTION_URLS.products);
  });

  it('падение товаров не роняет остальные секции и индекс', async () => {
    sitemapFails = true;

    const index = await getText('/sitemap.xml');
    assert.equal(index.res.status, 200, 'индекс отдал ошибку из-за одной секции');
    assert.equal((index.body.match(/<sitemap>/g) || []).length, 4);

    const staticSection = await getText('/sitemap-static.xml');
    assert.equal(staticSection.res.status, 200);
    assert.equal(countUrls(staticSection.body), EXPECTED_SECTION_URLS.static);
  });

  it('холодный старт при лежащем апстриме — валидный пустой urlset, но не 500', async () => {
    // Отдавать нечего: кэша ещё нет. Фиксируем, что это 200 с валидным XML,
    // а не 500 и не обрывок — краулер просто увидит секцию пустой.
    sitemapFails = true;

    const {res, body} = await getText('/sitemap-products.xml');
    assert.equal(res.status, 200);
    assert.match(body, /<urlset\b/);
    assert.match(body, /<\/urlset>$/);
    assert.equal(countUrls(body), 0);
  });
});

describe('server.ts — og:locale и og:type отрендеренной страницы', () => {
  before(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('/ru отдаётся как ru_MD', async () => {
    const {res, body} = await getText('/ru');
    assert.equal(res.status, 200);
    const og = ogTags(body);
    assert.equal(og['og:locale'], 'ru_MD');
    assert.equal(og['og:locale:alternate'], 'ro_MD');
    assert.match(body, /<html[^>]+lang="ru"/);
  });

  it('/ro отдаётся как ro_MD', async () => {
    const {res, body} = await getText('/ro');
    assert.equal(res.status, 200);
    const og = ogTags(body);
    assert.equal(og['og:locale'], 'ro_MD');
    assert.equal(og['og:locale:alternate'], 'ru_MD');
    assert.equal(og['og:type'], 'website', 'статическая страница не должна быть product');
    assert.match(body, /<html[^>]+lang="ro"/);
  });

  it('карточка товара помечена og:type=product и языком своего префикса', async () => {
    const {res, body} = await getText(`/ru/product/12/bombshell-eau-de-parfum`);
    assert.equal(res.status, 200);
    const og = ogTags(body);
    assert.equal(og['og:type'], 'product');
    assert.equal(og['og:locale'], 'ru_MD');
  });

  it('каждый og-тег локали выводится ровно один раз', async () => {
    const {body} = await getText('/ru');
    assert.equal((body.match(/property="og:locale"/g) || []).length, 1);
    assert.equal((body.match(/property="og:locale:alternate"/g) || []).length, 1);
    assert.equal((body.match(/property="og:type"/g) || []).length, 1);
  });
});

describe('server.ts — видимый H1 каталога', () => {
  before(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    await startServer();
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  it('на странице бренда ровно один h1, и он не спрятан', async () => {
    const {res, body} = await getText('/ro/catalog/brand/victorias-secret');
    assert.equal(res.status, 200);

    const headings = [...body.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    assert.equal(headings.length, 1, `ожидали один h1, нашли ${headings.length}`);

    const [tag, inner] = [headings[0][0], headings[0][1]];
    assert.ok(!/class="[^"]*visually-hidden/.test(tag), 'h1 снова спрятан visually-hidden');
    const text = inner.replace(/<!--[\s\S]*?-->/g, '').replace(/<[^>]+>/g, '').trim();
    assert.ok(text.length > 0, 'h1 пустой');
    assert.equal(text, "Victoria's Secret");
  });
});

/** Общая подготовка SR-96-блоков: чистое состояние заглушки и свежий инстанс сервера. */
function sr96Server() {
  before(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    categoriesEmpty = false;
    await startServer();
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });
}

const hasCanonical = html => /<link rel="canonical"/.test(html);
const hasHreflang = html => /<link rel="alternate"[^>]*hreflang/.test(html);
const NOINDEX = /<meta name="robots" content="noindex, nofollow"/;

describe('server.ts — SR-96: lowercase-301', () => {
  sr96Server();

  it('заглавные в пути → 301 на lowercase', async () => {
    const res = await get('/RO/catalog/Sutiene');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro/catalog/sutiene');
  });

  it('query сохраняется как есть (регистр значений тоже)', async () => {
    const res = await get('/RO/catalog/Sutiene?Brand=VS&a=1');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro/catalog/sutiene?Brand=VS&a=1');
  });

  it('слэш в конце + заглавные — один хоп, а не цепочка', async () => {
    const res = await get('/RO/catalog/Sutiene/?a=1');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro/catalog/sutiene?a=1');
  });

  it('путь уже в нижнем регистре — без редиректа', async () => {
    const res = await get('/ro/contacts');
    assert.equal(res.status, 200);
  });

  it('ассеты и файлы с расширением не трогает (регистр имён сохраняется)', async () => {
    for (const path of ['/favicon.ico', '/stores/atrium/Atrium-Collage.JPG', '/Manifest.webmanifest', '/Sitemap.xml']) {
      const res = await get(path);
      assert.notEqual(res.status, 301, `${path} не должен редиректиться`);
    }
  });

  it('/api не трогает', async () => {
    const res = await get('/api/Products/Brands');
    assert.notEqual(res.status, 301);
  });

  it('номер заказа и поисковый запрос — регистр параметра сохраняется', async () => {
    let res = await get('/RO/order-success/AbC123');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro/order-success/AbC123');
    res = await get('/ro/search/Bombshell');
    assert.notEqual(res.status, 301);
  });

  it('чужой язык в верхнем регистре — сразу 404, без лишнего хопа', async () => {
    const res = await get('/EN/Contacts');
    assert.equal(res.status, 404);
  });

  it('percent-escape в верхнем регистре не считается заглавными', async () => {
    const res = await get('/ru/catalog/%D0%B1');
    assert.notEqual(res.status, 301);
  });
});

describe('server.ts — SR-96: язык только ro/ru', () => {
  sr96Server();

  for (const path of ['/en', '/xx/contacts']) {
    it(`${path} → 404 с noindex и без canonical/hreflang`, async () => {
      const {res, body} = await getText(path);
      assert.equal(res.status, 404);
      assert.match(body, NOINDEX);
      assert.ok(!hasCanonical(body), 'canonical на 404');
      assert.ok(!hasHreflang(body), 'hreflang на 404');
    });
  }

  for (const path of ['/ro', '/ru/contacts']) {
    it(`${path} → 200 с canonical и hreflang`, async () => {
      const {res, body} = await getText(path);
      assert.equal(res.status, 200);
      assert.ok(hasCanonical(body));
      assert.ok(hasHreflang(body));
    });
  }
});

describe('server.ts — SR-96: легаси product-detail и /index.html', () => {
  sr96Server();

  it('/ro/product-detail/:id → 301 одним хопом на канонический адрес товара', async () => {
    const res = await get('/ro/product-detail/12');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro/product/12/bombshell-eau-de-parfum');
    const target = await get(res.headers.get('location'));
    assert.equal(target.status, 200, 'на цели второго 301 быть не должно');
  });

  it('/ru/product-detail/:id сохраняет язык и query', async () => {
    const res = await get('/ru/product-detail/3739?variant=5');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ru/product/3739/beauty-light-wand-pinkgasm?variant=5');
  });

  it('неизвестный id — не 301, а 404 Angular', async () => {
    const res = await get('/ro/product-detail/999999');
    assert.equal(res.status, 404);
  });

  it('/index.html → 301 /ro', async () => {
    const res = await get('/index.html');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro');
  });

  it('/ro/index.html → 301 /ro', async () => {
    const res = await get('/ro/index.html');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ro');
  });

  it('//host/index.html не уводит на чужой хост (не open redirect)', async () => {
    const res = await get('//evil.example/index.html');
    assert.notEqual(res.headers.get('location'), '//evil.example');
    assert.ok(!(res.headers.get('location') ?? '').startsWith('//'));
  });
});

describe('server.ts — SR-96: карточка товара, 404 против сбоя API', () => {
  sr96Server();

  /** Ответ findProduct для теста; null — отдаёт базовая заглушка. */
  let findProduct = null;
  let stubFetch = null;
  before(() => {
    stubFetch = globalThis.fetch;
    globalThis.fetch = async (input, init) => {
      if (findProduct && String(input).includes('products/findProduct/')) return findProduct();
      return stubFetch(input, init);
    };
  });
  after(() => {
    globalThis.fetch = stubFetch;
  });

  it('API ответил 404 → 404 + noindex, без canonical/hreflang', async () => {
    findProduct = () => json({message: 'not found'}, 404);
    const {res, body} = await getText('/ro/product/12/bombshell-eau-de-parfum');
    assert.equal(res.status, 404);
    assert.match(body, NOINDEX);
    assert.ok(!hasCanonical(body));
    assert.ok(!hasHreflang(body));
  });

  for (const [name, respond] of [
    ['500', () => new Response('boom', {status: 500})],
    ['сеть недоступна', () => Promise.reject(new TypeError('fetch failed'))],
  ]) {
    it(`сбой API (${name}) → 503 с Retry-After, no-store, без noindex и canonical`, async () => {
      findProduct = respond;
      const {res, body} = await getText('/ro/product/12/bombshell-eau-de-parfum');
      assert.equal(res.status, 503);
      assert.equal(res.headers.get('retry-after'), '120');
      assert.equal(res.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(body, NOINDEX);
      assert.ok(!hasCanonical(body));
      assert.ok(!hasHreflang(body));
    });
  }

  it('рабочая карточка — 200 с canonical и hreflang, как раньше', async () => {
    findProduct = null;
    const {res, body} = await getText('/ro/product/12/bombshell-eau-de-parfum');
    assert.equal(res.status, 200);
    assert.ok(hasCanonical(body));
  });
});

describe('server.ts — SR-96: каталог «не найдено» только по успешному ответу API', () => {
  sr96Server();

  for (const path of ['/ro/catalog/nu-exista', '/ro/catalog/brand/nu-exista']) {
    it(`${path} → 404 + noindex, без canonical/hreflang`, async () => {
      const {res, body} = await getText(path);
      assert.equal(res.status, 404);
      assert.match(body, NOINDEX);
      assert.ok(!hasCanonical(body));
      assert.ok(!hasHreflang(body));
    });
  }

  for (const path of ['/ro/catalog/brand/victorias-secret', '/ro/catalog/bestsellers']) {
    it(`${path} → 200 с canonical и hreflang`, async () => {
      const {res, body} = await getText(path);
      assert.equal(res.status, 200);
      assert.ok(hasCanonical(body));
      assert.ok(hasHreflang(body));
    });
  }
});

describe('server.ts — SR-96: сбой API — «не знаем», а не 404', () => {
  sr96Server();

  it('product-detail при лежащем API на холодном старте → 503, не 404', async () => {
    sitemapFails = true;
    try {
      const res = await get('/ro/product-detail/12');
      assert.equal(res.status, 503);
      assert.ok(res.headers.get('retry-after'));
      assert.equal(res.headers.get('cache-control'), 'no-store');
    } finally {
      sitemapFails = false;
    }
  });

  it('пустой список категорий от API — каталог не уходит в 404', async () => {
    categoriesEmpty = true;
    try {
      const {res, body} = await getText('/ro/catalog/sutiene');
      assert.notEqual(res.status, 404);
      assert.doesNotMatch(body, NOINDEX);
    } finally {
      categoriesEmpty = false;
    }
  });
});

describe('server.ts — склейка /catalog/vs и /catalog/bb на brand-страницы (SR-97)', () => {
  before(async () => {
    clockOffset = 0;
    sitemapCalls = 0;
    sitemapGate = null;
    sitemapFails = false;
    sitemapEmpty = false;
    categoriesEmpty = false;
    await startServer();
  });

  after(async () => {
    if (server) await new Promise(resolve => server.close(resolve));
    server = null;
  });

  const VS = '/catalog/brand/victorias-secret';
  const BB = '/catalog/brand/bath-and-body';

  /** Один хоп: 301 и Location сразу на конечный адрес, который сам уже не редиректит. */
  async function assertSingleHop(from, to) {
    const res = await get(from);
    assert.equal(res.status, 301, `${from} → ${res.status}`);
    assert.equal(res.headers.get('location'), to, `${from} увёл не туда`);
    const next = await get(to.split('?')[0]);
    assert.ok(![301, 302, 307, 308].includes(next.status), `${to} редиректит дальше — цепочка`);
  }

  for (const lang of ['ro', 'ru']) {
    it(`/${lang}/catalog/vs → 301 /${lang}${VS}`, async () => {
      await assertSingleHop(`/${lang}/catalog/vs`, `/${lang}${VS}`);
    });

    it(`/${lang}/catalog/bb → 301 /${lang}${BB}`, async () => {
      await assertSingleHop(`/${lang}/catalog/bb`, `/${lang}${BB}`);
    });
  }

  it('query string переживает редирект', async () => {
    let res = await get('/ru/catalog/bb?x=1&utm_source=fb');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), `/ru${BB}?x=1&utm_source=fb`);

    res = await get('/ro/catalog/vs/?page=2');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), `/ro${VS}?page=2`);
  });

  it('хвостовой слэш и верхний регистр — тоже один хоп, без промежуточного /catalog/vs', async () => {
    await assertSingleHop('/ro/catalog/vs/', `/ro${VS}`);
    await assertSingleHop('/ru/catalog/bb/', `/ru${BB}`);
    await assertSingleHop('/RO/catalog/VS', `/ro${VS}`);
  });

  it('чужой язык и похожие теги не перехватываются', async () => {
    const res = await get('/en/catalog/vs');
    assert.notEqual(res.headers.get('location'), `/en${VS}`);
    for (const path of ['/ro/catalog/vsx', '/ro/catalog/constructor', '/ro/catalog/bestsellers']) {
      const r = await get(path);
      assert.ok(!String(r.headers.get('location') || '').includes('/catalog/brand/'), `${path} ушёл на бренд`);
    }
  });

  it('легаси-адреса ведут сразу на brand-URL, без цепочки через /catalog/vs|bb', async () => {
    const cases = [
      ['/vs', `/ro${VS}`],
      ['/bb', `/ro${BB}`],
      ['/vs/all-vs-products', `/ro${VS}`],
      ['/bb/all-bb-products', `/ro${BB}`],
      ['/vs/category/5', `/ro${VS}`],
      ['/bb/category/5', `/ro${BB}`],
    ];
    for (const [from, to] of cases) await assertSingleHop(from, to);
  });

  it('sitemap: нет /catalog/vs и /catalog/bb, brand-URL — ровно по разу на язык', async () => {
    const xmls = [];
    for (const section of ['static', 'categories', 'brands', 'products']) {
      xmls.push((await getText(`/sitemap-${section}.xml`)).body);
    }
    const all = xmls.join('\n');
    assert.doesNotMatch(all, /<loc>[^<]*\/catalog\/(vs|bb)<\/loc>/);
    assert.doesNotMatch(all, /href="[^"]*\/catalog\/(vs|bb)"/);
    for (const lang of ['ro', 'ru']) {
      for (const path of [VS, BB]) {
        const loc = `<loc>https://secretroom.md/${lang}${path}</loc>`;
        assert.equal(all.split(loc).length - 1, 1, `${loc} встречается не один раз`);
      }
    }
  });
});

describe('server.ts — SR-103: пагинация каталога ?page=N', () => {
  sr96Server();

  const LIST = '/ro/catalog/bestsellers';
  const REDIRECTS = [301, 302, 307, 308];

  /** Один 301 сразу на `to`, и сам `to` дальше не редиректит. */
  async function assertSingleHop(from, to) {
    const res = await get(from);
    assert.equal(res.status, 301, `${from} → ${res.status}`);
    assert.equal(res.headers.get('location'), to, `${from} увёл не туда`);
    const next = await get(to);
    assert.ok(!REDIRECTS.includes(next.status), `${to} редиректит дальше (${next.status}) — цепочка`);
  }

  for (const junk of ['1', '0', '-2', 'abc', '02', '', '2.5']) {
    it(`?page=${junk} → 301 на адрес без page`, async () => {
      await assertSingleHop(`${LIST}?page=${junk}`, LIST);
    });
  }

  it('прочие query-параметры сохраняются, уходит только page', async () => {
    await assertSingleHop(`${LIST}?utm_source=fb&page=1&x=A%20b`, `${LIST}?utm_source=fb&x=A%20b`);
  });

  it('повторённый page — тоже мусор', async () => {
    await assertSingleHop(`${LIST}?page=2&page=3`, LIST);
  });

  it('?page=2 проходит в SSR без редиректа (вместе с прочими параметрами)', async () => {
    for (const path of [`${LIST}?page=2`, `${LIST}?page=2&utm_source=fb`]) {
      const res = await get(path);
      assert.equal(res.status, 200, `${path} → ${res.status}`);
    }
  });

  it('вне каталога page не трогаем', async () => {
    const res = await get('/ro/brands?page=1');
    assert.ok(!REDIRECTS.includes(res.status));
  });

  it('vs/bb + ?page=3 → один 301 на brand-URL с сохранённым page', async () => {
    await assertSingleHop('/ro/catalog/vs?page=3', '/ro/catalog/brand/victorias-secret?page=3');
    await assertSingleHop('/ru/catalog/bb/?utm_source=fb&page=3', '/ru/catalog/brand/bath-and-body?utm_source=fb&page=3');
  });

  it('vs/bb + мусорный page → один 301 сразу на чистый brand-URL', async () => {
    await assertSingleHop('/ro/catalog/vs?page=1', '/ro/catalog/brand/victorias-secret');
  });

  it('регистр/слэш + мусорный page → один хоп', async () => {
    await assertSingleHop('/RO/catalog/Bestsellers?page=1', LIST);
    await assertSingleHop(`${LIST}/?page=0&a=1`, `${LIST}?a=1`);
    await assertSingleHop('/RO/catalog/Bestsellers?page=2', `${LIST}?page=2`);
  });

  it('слаг категории не того языка → 301 с сохранённым ?page', async () => {
    const res = await get('/ru/catalog/sutiene?page=3');
    assert.equal(res.status, 301);
    assert.equal(res.headers.get('location'), '/ru/catalog/byustgaltery?page=3');
  });

  it('страница 2: 200, self-canonical и hreflang с ?page=2, свой title, prev-ссылка, товары второй страницы', async () => {
    const {res, body} = await getText(`${LIST}?page=2`);
    assert.equal(res.status, 200);
    assert.match(body, /<link rel="canonical" href="https:\/\/secretroom\.md\/ro\/catalog\/bestsellers\?page=2">/);
    assert.match(body, /hreflang="ru" href="https:\/\/secretroom\.md\/ru\/catalog\/bestsellers\?page=2"/);
    assert.match(body, /<title>[^<]*— pagina 2[^<]*<\/title>/);
    assert.match(body, /<meta name="robots" content="index, follow/);
    assert.doesNotMatch(body, /noindex/);
    // 30 товаров по 24: вторая страница последняя — prev на чистый адрес, next нет
    const prev = body.match(/<a\b[^>]*class="prev-page-link[^"]*"[^>]*>/);
    assert.ok(prev, 'нет ссылки на предыдущую страницу');
    assert.match(prev[0], /href="\/ro\/catalog\/bestsellers"/);
    assert.doesNotMatch(body, /class="load-more-btn/);
    assert.match(body, /<link rel="prev" href="https:\/\/secretroom\.md\/ro\/catalog\/bestsellers">/);
    assert.doesNotMatch(body, /<link rel="next"/);
    assert.ok(body.includes('Bestseller 24'), 'нет товаров второй страницы');
    assert.ok(!/Bestseller [0-9]\b/.test(body), 'в HTML товары первой страницы');
  });

  it('страница 1: canonical без page, next-ссылка на ?page=2, prev нет', async () => {
    const {res, body} = await getText(LIST);
    assert.equal(res.status, 200);
    assert.match(body, /<link rel="canonical" href="https:\/\/secretroom\.md\/ro\/catalog\/bestsellers">/);
    assert.doesNotMatch(body, /<title>[^<]*pagina/);
    const next = body.match(/<a\b[^>]*class="load-more-btn[^"]*"[^>]*>/);
    assert.ok(next, 'нет ссылки «Încarcă mai multe»');
    assert.match(next[0], /href="\/ro\/catalog\/bestsellers\?page=2"/);
    assert.doesNotMatch(body, /class="prev-page-link/);
    assert.match(body, /<link rel="next" href="https:\/\/secretroom\.md\/ro\/catalog\/bestsellers\?page=2">/);
  });

  for (const path of [`${LIST}?page=999`, '/ro/catalog/sales?page=2']) {
    it(`страница за последней (${path}) → 404 + noindex, без canonical/hreflang/prev/next, не 5xx`, async () => {
      const {res, body} = await getText(path);
      assert.equal(res.status, 404);
      assert.match(body, NOINDEX);
      assert.ok(!hasCanonical(body));
      assert.ok(!hasHreflang(body));
      assert.doesNotMatch(body, /<link rel="(prev|next)"/);
    });
  }
});
