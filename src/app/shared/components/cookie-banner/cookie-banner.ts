import { Component, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-cookie-banner',
  standalone: true,
  imports: [CommonModule, TranslocoModule],
  templateUrl: './cookie-banner.html',
  styleUrls: ['./cookie-banner.scss']
})
export class CookieBanner implements OnInit {
  isVisible = false;
  private readonly COOKIE_CONSENT_KEY = 'cookie_consent';
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const consent = localStorage.getItem(this.COOKIE_CONSENT_KEY);
      if (!consent) {
        this.isVisible = true;
      }
    }
  }

  acceptCookies() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.COOKIE_CONSENT_KEY, 'accepted');
    }
    this.isVisible = false;
  }

  declineCookies() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(this.COOKIE_CONSENT_KEY, 'declined');
    }
    this.isVisible = false;
  }
}
