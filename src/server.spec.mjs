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
  static: 20,      // 10 статических страниц
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
    if (url.includes('web-categories/hierarchy/active')) return json(CATEGORIES);
    if (url.endsWith('products/brands')) return json(BRANDS);
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
    const {res, body} = await getText('/ro/catalog/vs');
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
