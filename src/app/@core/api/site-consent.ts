import {inject, Injectable, InjectionToken, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {environment} from '../../../environments/environment';
import {deviceOf, isBotNavigator, postBeacon, siteLanguageOf, TRACKER_NAVIGATOR} from './site-tracker';

/** SR-213: share of cookie consents (contract sr-213-consent-contract.md). */

export type ConsentDecision = 'ACCEPTED' | 'DECLINED';

/** Body of POST v1/site-events/consent. Anonymous: no visitorId, no personal data. */
export interface ConsentEventBody {
  consent: ConsentDecision;
  language?: string;
  device: 'MOBILE' | 'TABLET' | 'DESKTOP';
}

export const CONSENT_TRACKING_ENABLED = new InjectionToken<boolean>('CONSENT_TRACKING_ENABLED', {
  providedIn: 'root',
  factory: () => environment.consentTracking === true,
});

/**
 * Fire-and-forget report of the cookie banner decision → POST v1/site-events/consent (sendBeacon).
 * Browser only, not for bots, with environment.consentTracking. Never throws.
 */
@Injectable({providedIn: 'root'})
export class SiteConsent {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly enabled = inject(CONSENT_TRACKING_ENABLED);
  private readonly nav = inject(TRACKER_NAVIGATOR);
  private readonly url = environment.apiUrl + 'v1/site-events/consent';

  report(consent: ConsentDecision): void {
    try {
      if (!this.isBrowser || !this.enabled || isBotNavigator(this.nav)) return;
      const path = typeof location !== 'undefined' ? location.pathname : '';
      const body: ConsentEventBody = {consent, language: siteLanguageOf(path), device: deviceOf(this.nav)};
      postBeacon(this.nav, this.url, JSON.stringify(body));
    } catch {
      // a broken report must never affect the site
    }
  }
}
