import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {provideRouter} from '@angular/router';
import {
  checkoutFailCode, COOKIE_CONSENT_KEY, cutEvent, pageTypeOf, searchQueryOf, SiteTracker,
  TRACKER_BATCH_MAX, TRACKER_ENABLED, TRACKER_FLUSH_MS, TRACKER_NAVIGATOR, TrackerNavigator,
  VISITOR_ID_KEY, VisitorBatch, VisitorEvent,
} from './site-tracker';
import {CartItem} from '../../entities/cart-item';
import {Product} from '../../entities/product';

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('SiteTracker', () => {
  let tracker: SiteTracker;
  let nav: TrackerNavigator & {sendBeacon: jasmine.Spy};
  let fetchSpy: jasmine.Spy;

  function setup(opts: {platform?: 'browser' | 'server'; enabled?: boolean; consent?: string | null; ua?: string; webdriver?: boolean} = {}) {
    localStorage.clear();
    sessionStorage.clear();
    if (opts.consent !== null) localStorage.setItem(COOKIE_CONSENT_KEY, opts.consent ?? 'accepted');
    nav = {userAgent: opts.ua ?? HUMAN_UA, webdriver: opts.webdriver ?? false, sendBeacon: jasmine.createSpy('sendBeacon').and.returnValue(true)};
    fetchSpy = jasmine.isSpy(window.fetch) ? (window.fetch as jasmine.Spy) : spyOn(window, 'fetch');
    fetchSpy.calls.reset();
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, {status: 202})));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: PLATFORM_ID, useValue: opts.platform ?? 'browser'},
        {provide: TRACKER_ENABLED, useValue: opts.enabled ?? true},
        {provide: TRACKER_NAVIGATOR, useValue: nav},
      ],
    });
    tracker = TestBed.inject(SiteTracker);
    spyOn(tracker as unknown as {defer: (fn: () => void) => void}, 'defer').and.callFake((fn: () => void) => fn());
  }

  const item = (id = '7') => new CartItem({id, name: 'Bra', price: 450} as Product, 2, {sizeType: '75B'} as never, 12);

  async function beaconBodies(): Promise<VisitorBatch[]> {
    const out: VisitorBatch[] = [];
    for (const call of nav.sendBeacon.calls.all()) {
      const blob = call.args[1] as Blob;
      expect(blob.type).toBe('text/plain;charset=utf-8');
      out.push(JSON.parse(await blob.text()));
    }
    return out;
  }

  function exercise() {
    tracker.handleNavigation('/ro/catalog/sale?utm_source=ig');
    tracker.cartChange('ADD_TO_CART', item());
    tracker.click('ADD_TO_CART');
    tracker.checkoutSubmit({phone: '069123456', firstName: 'Ion', lastName: 'Pop', amount: 900, paymentMethod: 'CashOnDelivery'});
    tracker.checkoutSuccess('abc');
    tracker.flush();
  }

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('without consent: no requests, no visitorId', () => {
    setup({consent: null});
    exercise();
    tracker.setConsent(false);
    exercise();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(tracker.consentedVisitorId()).toBeUndefined();
  });

  it('declined consent is the same as none', () => {
    setup({consent: 'declined'});
    exercise();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
  });

  it('with consent: creates visitorId, buffers and sends a batch via sendBeacon', async () => {
    setup();
    tracker.handleNavigation('/ro/search/rochie%20rosie?utm_source=ig&utm_medium=story&utm_campaign=bf');
    tracker.cartChange('ADD_TO_CART', item());
    expect(nav.sendBeacon).not.toHaveBeenCalled(); // buffered
    const id = localStorage.getItem(VISITOR_ID_KEY)!;
    expect(id).toMatch(UUID);

    tracker.flush();
    expect(nav.sendBeacon).toHaveBeenCalledTimes(1);
    expect(nav.sendBeacon.calls.mostRecent().args[0]).toMatch(/\/api\/v1\/site-events\/visitor$/);
    const [body] = await beaconBodies();
    expect(body.visitorId).toBe(id);
    expect(body.language).toBe('ro');
    expect(body.events.map(e => e.action)).toEqual(['VISIT_START', 'PAGE_VIEW', 'ADD_TO_CART']);
    const [start, view, add] = body.events;
    expect(start.utmSource).toBe('ig');
    expect(start.utmMedium).toBe('story');
    expect(start.utmCampaign).toBe('bf');
    expect(start.device).toBe(window.innerWidth < 768 ? 'MOBILE' : window.innerWidth < 1024 ? 'TABLET' : 'DESKTOP');
    expect(view.pageType).toBe('SEARCH');
    expect(view.pageUrl).toBe('/ro/search/rochie%20rosie');
    expect(view.searchQuery).toBe('rochie rosie');
    expect(add.cart).toEqual([{appId: 7, variantAppId: 12, name: 'Bra', size: '75B', quantity: 2, price: 450}]);
    for (const e of body.events) {
      expect(e.eventId).toMatch(UUID);
      expect(new Date(e.occurredAt).toISOString()).toBe(e.occurredAt);
    }
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('VISIT_START once per tab session; CHECKOUT_OPEN on the checkout page', async () => {
    setup();
    tracker.handleNavigation('/ru');
    tracker.handleNavigation('/ru/checkout');
    tracker.flush();
    const [body] = await beaconBodies();
    expect(body.language).toBe('ru');
    expect(body.events.map(e => e.action)).toEqual(['VISIT_START', 'PAGE_VIEW', 'PAGE_VIEW', 'CHECKOUT_OPEN']);
  });

  it('flushes by itself at 20 events, batches never exceed 50', async () => {
    setup();
    sessionStorage.setItem('sr_visit_started', '1');
    for (let i = 0; i < 20; i++) tracker.cartChange('ADD_TO_CART', item());
    expect(nav.sendBeacon).toHaveBeenCalledTimes(1);
    expect((await beaconBodies())[0].events.length).toBe(20);

    nav.sendBeacon.calls.reset();
    const internal = tracker as unknown as {buffer: VisitorEvent[]};
    internal.buffer = Array.from({length: 120}, (_, i) => ({eventId: String(i), action: 'PAGE_VIEW', occurredAt: ''}));
    tracker.flush();
    const sizes = (await beaconBodies()).map(b => b.events.length);
    expect(sizes).toEqual([TRACKER_BATCH_MAX, TRACKER_BATCH_MAX, 20]);
  });

  it('flushes on the timer and on pagehide', () => {
    jasmine.clock().install();
    try {
      setup();
      tracker.handleNavigation('/ro');
      expect(nav.sendBeacon).not.toHaveBeenCalled();
      jasmine.clock().tick(TRACKER_FLUSH_MS + 1);
      expect(nav.sendBeacon).toHaveBeenCalledTimes(1);

      tracker.click('FAVORITE');
      window.dispatchEvent(new Event('pagehide'));
      expect(nav.sendBeacon).toHaveBeenCalledTimes(2);
    } finally {
      jasmine.clock().uninstall();
    }
  });

  it('sends checkout milestones immediately', () => {
    setup();
    tracker.checkoutSubmit({phone: '069123456', firstName: 'Ion', lastName: 'Pop', amount: 900, paymentMethod: 'CashOnDelivery'});
    expect(nav.sendBeacon).toHaveBeenCalledTimes(1);
  });

  it('bots and webdriver: nothing', () => {
    for (const opts of [{webdriver: true}, {ua: 'Googlebot/2.1'}, {ua: 'Mozilla/5.0 HeadlessChrome/120'},
      {ua: 'facebookexternalhit/1.1'}, {ua: 'Chrome-Lighthouse'}, {ua: 'Mozilla/5.0 (compatible; bingbot/2.0)'}]) {
      TestBed.resetTestingModule();
      setup(opts);
      exercise();
      expect(nav.sendBeacon).withContext(JSON.stringify(opts)).not.toHaveBeenCalled();
      expect(fetchSpy).withContext(JSON.stringify(opts)).not.toHaveBeenCalled();
      expect(localStorage.getItem(VISITOR_ID_KEY)).withContext(JSON.stringify(opts)).toBeNull();
    }
  });

  it('environment switch off: nothing', () => {
    setup({enabled: false});
    exercise();
    tracker.init();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(tracker.consentedVisitorId()).toBeUndefined();
  });

  it('SSR: nothing', () => {
    setup({platform: 'server'});
    tracker.init();
    exercise();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(tracker.consentedVisitorId()).toBeUndefined();
  });

  it('sendBeacon false → fetch keepalive without credentials', async () => {
    setup();
    nav.sendBeacon.and.returnValue(false);
    tracker.click('PAY');
    tracker.flush();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/site-events\/visitor$/);
    expect(init.keepalive).toBeTrue();
    expect(init.credentials).toBe('omit');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string).events[0].button).toBe('PAY');
  });

  it('sendBeacon throws, fetch rejects or throws → swallowed', async () => {
    setup();
    nav.sendBeacon.and.throwError('boom');
    fetchSpy.and.returnValue(Promise.reject(new TypeError('offline')));
    expect(() => {
      tracker.click('PAY');
      tracker.flush();
    }).not.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.and.throwError('sync boom');
    expect(() => tracker.checkoutSuccess('x')).not.toThrow();
    await Promise.resolve();
  });

  it('declining later drops the buffer and the id', () => {
    setup();
    tracker.click('FAVORITE');
    expect(localStorage.getItem(VISITOR_ID_KEY)).not.toBeNull();
    tracker.setConsent(false);
    tracker.flush();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    tracker.click('FAVORITE');
    tracker.flush();
    expect(nav.sendBeacon).not.toHaveBeenCalled();
  });

  it('accepting in the same tab starts tracking at once', async () => {
    setup({consent: null});
    tracker.handleNavigation('/ro/favorites');
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    tracker.setConsent(true);
    tracker.flush();
    const [body] = await beaconBodies();
    expect(body.events.map(e => [e.action, e.pageType])).toEqual([['VISIT_START', 'FAVORITES'], ['PAGE_VIEW', 'FAVORITES']]);
  });

  it('ORDER_LINK once per order, CUSTOMER_LINK once per login', async () => {
    setup();
    const order = {orderNumber: '1234', customer: {firstName: 'Ion', lastName: 'Pop', phone: '069123456'}};
    tracker.orderLink(order, 'trk-1');
    tracker.orderLink(order, 'trk-1');
    const payload = btoa(JSON.stringify({sub: 'acc-42'})).replace(/=+$/, '');
    const user = {accessToken: `h.${payload}.s`, givenName: 'Ion', familyName: 'Pop'};
    tracker.customerLink(user);
    tracker.customerLink(user);
    const events = (await beaconBodies()).flatMap(b => b.events);
    expect(events.map(e => e.action)).toEqual(['ORDER_LINK', 'CUSTOMER_LINK']);
    expect(events[0]).toEqual(jasmine.objectContaining({orderId: 1234, orderTrackingNumber: 'trk-1', customerPhone: '069123456', customerName: 'Ion Pop'}));
    expect(events[1]).toEqual(jasmine.objectContaining({customerRef: 'acc-42', customerName: 'Ion Pop'}));
    expect(JSON.stringify(events)).not.toContain(user.accessToken);
  });

  it('CHECKOUT_FAIL carries a short code', async () => {
    setup();
    tracker.checkoutFail({status: 409, error: {error: 'OUT_OF_STOCK', message: 'No stock'}});
    const [body] = await beaconBodies();
    expect(body.events[0]).toEqual(jasmine.objectContaining({action: 'CHECKOUT_FAIL', errorCode: 'OUT_OF_STOCK', message: '409 No stock'}));
    expect(checkoutFailCode({status: 0})).toBe('NETWORK');
    expect(checkoutFailCode({status: 504, error: null})).toBe('SERVER_ERROR');
    expect(checkoutFailCode({status: 400, error: {}})).toBe('VALIDATION');
    expect(checkoutFailCode({status: 409, error: {error: 'PRODUCT_UNAVAILABLE'}})).toBe('PRODUCT_UNAVAILABLE');
    expect(checkoutFailCode(null)).toBe('UNEXPECTED');
  });

  it('classifies pages by the router URL', () => {
    const cases: [string, string][] = [
      ['/ro', 'HOME'], ['/ru?fbclid=1', 'HOME'], ['/', 'HOME'],
      ['/ro/catalog/sale', 'CATALOG'], ['/ro/catalog/brand/vs', 'CATALOG'], ['/ru/catalog/hero/5', 'CATALOG'], ['/ro/brands', 'CATALOG'],
      ['/ro/product/12/bra-x', 'PRODUCT'], ['/ro/search/bra', 'SEARCH'], ['/ro/checkout', 'CHECKOUT'],
      ['/ro/order-success/abc', 'ORDER_SUMMARY'], ['/ro/cabinet', 'ACCOUNT'], ['/ru/order/abc', 'ACCOUNT'],
      ['/ro/favorites', 'FAVORITES'], ['/ro/contacts', 'OTHER'], ['/ro/login', 'OTHER'], ['/en/x', 'OTHER'],
    ];
    for (const [url, type] of cases) expect(pageTypeOf(url)).withContext(url).toBe(type as never);
    expect(searchQueryOf('/ro/search/a%20b?x=1')).toBe('a b');
    expect(searchQueryOf('/ro/search/%E0%A4%A')).toBe('%E0%A4%A');
    expect(searchQueryOf('/ro/catalog/x')).toBeUndefined();
  });

  it('cuts fields to the contract lengths', () => {
    const long = (n: number) => 'x'.repeat(n);
    const e = cutEvent({
      eventId: 'e', action: 'PAGE_VIEW', occurredAt: '', pageUrl: long(900), searchQuery: long(900), referrer: long(900),
      utmSource: long(300), utmMedium: long(300), utmCampaign: long(300), customerName: long(300), customerPhone: long(80),
      customerRef: long(300), message: long(5000), cart: [{appId: 1, variantAppId: null, name: long(500), size: long(80), quantity: 1, price: 1}],
    });
    expect(e.pageUrl!.length).toBe(500);
    expect(e.searchQuery!.length).toBe(200);
    expect(e.referrer!.length).toBe(500);
    expect([e.utmSource!.length, e.utmMedium!.length, e.utmCampaign!.length]).toEqual([100, 100, 100]);
    expect(e.customerName!.length).toBe(200);
    expect(e.customerPhone!.length).toBe(50);
    expect(e.customerRef!.length).toBe(100);
    expect(e.message!.length).toBe(300);
    expect(e.cart![0].name!.length).toBe(200);
    expect(e.cart![0].size!.length).toBe(50);
  });
});
