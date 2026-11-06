import { ChangeDetectionStrategy, Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';
import { GoogleAnalytics } from '../../../@core/services/google-analytics';
import { SiteTracker } from '../../../@core/api/site-tracker';
import { ConsentDecision, SiteConsent } from '../../../@core/api/site-consent';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './cookie-banner.html',
  styleUrls: ['./cookie-banner.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBanner implements OnInit {
  isVisible = false;
  private readonly COOKIE_CONSENT_KEY = 'cookie_consent';
  private platformId = inject(PLATFORM_ID);
  private ga = inject(GoogleAnalytics);
  private tracker = inject(SiteTracker);
  private consentReport = inject(SiteConsent);
  /** SR-213: the decision is reported once per banner showing (double click, repeated call — nothing more). */
  private decisionReported = false;

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const consent = localStorage.getItem(this.COOKIE_CONSENT_KEY);
      if (!consent) {
        this.isVisible = true;
        this.decisionReported = false;
      } else if (consent === 'accepted') {
        this.ga.grantConsent();
      }
    }
  }

  acceptCookies() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.COOKIE_CONSENT_KEY, 'accepted');
      this.ga.grantConsent();
      this.tracker.setConsent(true);
      this.reportDecision('ACCEPTED');
    }
    this.isVisible = false;
  }

  declineCookies() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.COOKIE_CONSENT_KEY, 'declined');
      this.ga.denyConsent();
      this.tracker.setConsent(false);
      this.reportDecision('DECLINED');
    }
    this.isVisible = false;
  }

  /** Only a click on the shown banner counts; a saved choice never shows the banner, so no event. */
  private reportDecision(decision: ConsentDecision) {
    if (!this.isVisible || this.decisionReported) return;
    this.decisionReported = true;
    this.consentReport.report(decision);
  }
}
