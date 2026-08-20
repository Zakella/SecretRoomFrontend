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
  {appId: 3739, name: ' BEAUTY LIGHT WAND PINKGASM'},
  {appId: 12, name: 'Bombshell Eau de Parfum'},
];

const realFetch = globalThis.fetch;
const realNow = Date.now;

let clockOffset = 0;
let sitemapCalls = 0;
/** Позволяет тесту придержать ответ апстрима и поймать два запроса в одном окне. */
let sitemapGate = null;
let sitemapFails = false;

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
      return json(PRODUCTS);
    }
    // остальные апстримы (бренды, категории) в этих тестах не участвуют
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
    const res = await get(CANONICAL);
    assert.notEqual(res.status, 301);
    assert.equal(res.headers.get('location'), null);
  });

  it('не зацикливается: цель редиректа отдаётся без нового 301', async () => {
    const first = await get(DIRTY);
    assert.equal(first.status, 301);

    const second = await get(first.headers.get('location'));
    assert.notEqual(second.status, 301);
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
