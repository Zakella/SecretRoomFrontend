import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {CONSENT_TRACKING_ENABLED, ConsentEventBody, SiteConsent} from './site-consent';
import {TRACKER_NAVIGATOR, TrackerNavigator} from './site-tracker';

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';

describe('SiteConsent (SR-213)', () => {
  let consent: SiteConsent;
  let nav: TrackerNavigator & {sendBeacon: jasmine.Spy};
  let fetchSpy: jasmine.Spy;

  function setup(opts: {platform?: 'browser' | 'server'; enabled?: boolean; ua?: string; webdriver?: boolean} = {}) {
    nav = {userAgent: opts.ua ?? HUMAN_UA, webdriver: opts.webdriver ?? false, sendBeacon: jasmine.createSpy('sendBeacon').and.returnValue(true)};
    fetchSpy = jasmine.isSpy(window.fetch) ? (window.fetch as jasmine.Spy) : spyOn(window, 'fetch');
    fetchSpy.calls.reset();
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, {status: 202})));
    TestBed.configureTestingModule({
      providers: [
        {provide: PLATFORM_ID, useValue: opts.platform ?? 'browser'},
        {provide: CONSENT_TRACKING_ENABLED, useValue: opts.enabled ?? true},
        {provide: TRACKER_NAVIGATOR, useValue: nav},
      ],
    });
    consent = TestBed.inject(SiteConsent);
  }

  async function beaconBody(): Promise<ConsentEventBody> {
    expect(nav.sendBeacon).toHaveBeenCalledTimes(1);
    const [url, blob] = nav.sendBeacon.calls.mostRecent().args as [string, Blob];
    expect(url).toMatch(/\/api\/v1\/site-events\/consent$/);
    expect(blob.type).toBe('text/plain;charset=utf-8');
    return JSON.parse(await blob.text());
  }

  it('ACCEPTED: one anonymous beacon with consent, language and device', async () => {
    setup({ua: IPHONE_UA});
    consent.report('ACCEPTED');
    const body = await beaconBody();
    expect(body.consent).toBe('ACCEPTED');
    expect(body.device).toBe('MOBILE');
    expect(Object.keys(body).every(k => ['consent', 'language', 'device'].includes(k))).withContext(JSON.stringify(body)).toBeTrue();
    expect(JSON.stringify(body)).not.toContain('visitorId');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('DECLINED: same request with DECLINED', async () => {
    setup();
    consent.report('DECLINED');
    const body = await beaconBody();
    expect(body.consent).toBe('DECLINED');
    expect(['MOBILE', 'TABLET', 'DESKTOP']).toContain(body.device);
  });

  it('language is the site language ro/ru', async () => {
    setup();
    const html = document.documentElement;
    const prev = html.lang;
    html.lang = 'ru';
    try {
      consent.report('ACCEPTED');
      expect((await beaconBody()).language).toBe('ru');
    } finally {
      html.lang = prev;
    }
  });

  it('bots and webdriver: nothing', () => {
    for (const opts of [{webdriver: true}, {ua: 'Googlebot/2.1'}, {ua: 'Mozilla/5.0 HeadlessChrome/120'}, {ua: 'Chrome-Lighthouse'}]) {
      TestBed.resetTestingModule();
      setup(opts);
      consent.report('ACCEPTED');
      expect(nav.sendBeacon).withContext(JSON.stringify(opts)).not.toHaveBeenCalled();
      expect(fetchSpy).withContext(JSON.stringify(opts)).not.toHaveBeenCalled();
    }
  });

  it('environment switch off: nothing', () => {
    setup({enabled: false});
    consent.report('ACCEPTED');
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('SSR: nothing', () => {
    setup({platform: 'server'});
    consent.report('DECLINED');
    expect(nav.sendBeacon).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('sendBeacon false → fetch keepalive text/plain', () => {
    setup();
    nav.sendBeacon.and.returnValue(false);
    consent.report('DECLINED');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.calls.mostRecent().args as [string, RequestInit];
    expect(url).toMatch(/\/api\/v1\/site-events\/consent$/);
    expect(init.method).toBe('POST');
    expect(init.keepalive).toBeTrue();
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('text/plain;charset=UTF-8');
    const body = JSON.parse(init.body as string);
    expect(body.consent).toBe('DECLINED');
    expect(body.visitorId).toBeUndefined();
  });

  it('sendBeacon throws, fetch rejects or throws → swallowed', async () => {
    setup();
    nav.sendBeacon.and.throwError('boom');
    fetchSpy.and.returnValue(Promise.reject(new TypeError('offline')));
    expect(() => consent.report('ACCEPTED')).not.toThrow();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    fetchSpy.and.throwError('sync boom');
    expect(() => consent.report('DECLINED')).not.toThrow();
    await Promise.resolve();
  });
});
