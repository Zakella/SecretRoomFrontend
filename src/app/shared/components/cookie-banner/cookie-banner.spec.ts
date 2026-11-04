import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {provideRouter} from '@angular/router';
import {CookieBanner} from './cookie-banner';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';
import {SiteTracker, TRACKER_ENABLED, TRACKER_NAVIGATOR, VISITOR_ID_KEY} from '../../../@core/api/site-tracker';

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
    expect(beacon).toHaveBeenCalled();
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
});
