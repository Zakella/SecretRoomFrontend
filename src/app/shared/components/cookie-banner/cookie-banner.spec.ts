import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {provideRouter} from '@angular/router';
import {CookieBanner} from './cookie-banner';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';
import {SiteTracker, TRACKER_ENABLED, TRACKER_NAVIGATOR, VISITOR_ID_KEY} from '../../../@core/api/site-tracker';
import {CONSENT_TRACKING_ENABLED} from '../../../@core/api/site-consent';

describe('CookieBanner (SR-207 consent)', () => {
  let beacon: jasmine.Spy;
  let tracker: SiteTracker;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    beacon = jasmine.createSpy('sendBeacon').and.returnValue(true);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: TRACKER_ENABLED, useValue: true},
        {provide: CONSENT_TRACKING_ENABLED, useValue: true},
        {provide: TRACKER_NAVIGATOR, useValue: {userAgent: 'Mozilla/5.0 Chrome/120', webdriver: false, sendBeacon: beacon}},
        {provide: GoogleAnalytics, useValue: jasmine.createSpyObj('GoogleAnalytics', ['grantConsent', 'denyConsent'])},
      ],
    });
    tracker = TestBed.inject(SiteTracker);
    spyOn(tracker as unknown as {defer: (fn: () => void) => void}, 'defer').and.callFake((fn: () => void) => fn());
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  const banner = () => TestBed.runInInjectionContext(() => new CookieBanner());

  it('"Accept" turns the tracker on in the same tab', () => {
    const b = banner();
    b.ngOnInit();
    expect(b.isVisible).toBeTrue();
    tracker.click('FAVORITE');
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();

    b.acceptCookies();
    expect(localStorage.getItem('cookie_consent')).toBe('accepted');
    tracker.click('FAVORITE');
    tracker.flush();
    expect(beaconUrls().filter(u => u.endsWith('/site-events/visitor')).length).toBe(1);
    expect(localStorage.getItem(VISITOR_ID_KEY)).not.toBeNull();
  });

  it('"Decline" keeps the tracker off', () => {
    const b = banner();
    b.declineCookies();
    tracker.click('FAVORITE');
    tracker.flush();
    expect(beacon).not.toHaveBeenCalled();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
  });

  // ---- SR-213: share of cookie consents ----

  const beaconUrls = () => beacon.calls.all().map(c => c.args[0] as string);

  async function consentBodies(): Promise<Record<string, unknown>[]> {
    const out: Record<string, unknown>[] = [];
    for (const call of beacon.calls.all()) {
      if (!(call.args[0] as string).endsWith('/site-events/consent')) continue;
      out.push(JSON.parse(await (call.args[1] as Blob).text()));
    }
    return out;
  }

  it('"Accept" on the shown banner sends one ACCEPTED event without visitorId', async () => {
    const b = banner();
    b.ngOnInit();
    b.acceptCookies();
    const bodies = await consentBodies();
    expect(bodies.length).toBe(1);
    expect(bodies[0]['consent']).toBe('ACCEPTED');
    expect(bodies[0]['visitorId']).toBeUndefined();
    expect(localStorage.getItem('cookie_consent')).toBe('accepted');
  });

  it('"Decline" on the shown banner sends one DECLINED event, the tracker stays off', async () => {
    const b = banner();
    b.ngOnInit();
    b.declineCookies();
    const bodies = await consentBodies();
    expect(bodies.length).toBe(1);
    expect(bodies[0]['consent']).toBe('DECLINED');
    tracker.click('FAVORITE');
    tracker.flush();
    expect(beaconUrls().some(u => u.endsWith('/site-events/visitor'))).toBeFalse();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(localStorage.getItem('cookie_consent')).toBe('declined');
  });

  it('double click / repeated call within one showing: still one event', async () => {
    const b = banner();
    b.ngOnInit();
    b.acceptCookies();
    b.acceptCookies();
    b.declineCookies();
    const bodies = await consentBodies();
    expect(bodies.length).toBe(1);
    expect(bodies[0]['consent']).toBe('ACCEPTED');
  });

  it('saved choice: banner hidden, no event', () => {
    for (const saved of ['accepted', 'declined']) {
      beacon.calls.reset();
      localStorage.setItem('cookie_consent', saved);
      const b = banner();
      b.ngOnInit();
      expect(b.isVisible).withContext(saved).toBeFalse();
      b.acceptCookies();
      b.declineCookies();
      expect(beaconUrls().some(u => u.endsWith('/site-events/consent'))).withContext(saved).toBeFalse();
    }
  });

  it('the tracker starts only after accept, not by the consent event itself', () => {
    const b = banner();
    b.ngOnInit();
    b.declineCookies();
    expect(localStorage.getItem(VISITOR_ID_KEY)).toBeNull();
    expect(beaconUrls().some(u => u.endsWith('/site-events/visitor'))).toBeFalse();
  });
});

describe('CookieBanner (SR-213 consent event switches)', () => {
  function setup(opts: {platform?: 'browser' | 'server'; enabled?: boolean; webdriver?: boolean}) {
    localStorage.clear();
    const beacon = jasmine.createSpy('sendBeacon').and.returnValue(true);
    const fetchSpy = jasmine.isSpy(window.fetch) ? (window.fetch as jasmine.Spy) : spyOn(window, 'fetch');
    fetchSpy.calls.reset();
    fetchSpy.and.returnValue(Promise.resolve(new Response(null, {status: 202})));
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {provide: PLATFORM_ID, useValue: opts.platform ?? 'browser'},
        {provide: TRACKER_ENABLED, useValue: true},
        {provide: CONSENT_TRACKING_ENABLED, useValue: opts.enabled ?? true},
        {provide: TRACKER_NAVIGATOR, useValue: {userAgent: 'Mozilla/5.0 Chrome/120', webdriver: opts.webdriver ?? false, sendBeacon: beacon}},
        {provide: GoogleAnalytics, useValue: jasmine.createSpyObj('GoogleAnalytics', ['grantConsent', 'denyConsent'])},
      ],
    });
    const b = TestBed.runInInjectionContext(() => new CookieBanner());
    b.isVisible = true; // as if shown (on the server ngOnInit never shows it)
    return {b, beacon, fetchSpy};
  }

  afterEach(() => localStorage.clear());

  for (const [name, opts] of [
    ['consentTracking=false', {enabled: false}],
    ['webdriver', {webdriver: true}],
    ['SSR', {platform: 'server'}],
  ] as const) {
    it(`${name}: no consent event`, () => {
      const {b, beacon, fetchSpy} = setup(opts);
      b.acceptCookies();
      const consentCalls = [...beacon.calls.all(), ...fetchSpy.calls.all()]
        .filter(c => String(c.args[0]).endsWith('/site-events/consent'));
      expect(consentCalls.length).toBe(0);
    });
  }
});
