import {Component, OnInit, signal} from '@angular/core';

@Component({
  selector: 'app-mobile-redirect-banner',
  imports: [],
  templateUrl: './mobile-redirect-banner.html',
  styleUrl: './mobile-redirect-banner.scss'
})
export class MobileRedirectBanner implements OnInit{
  private localStorageKey = 'mobileAppBannerDismissed';
  isVisible = signal(false);

  ngOnInit() {
    if (this.shouldShowBanner()) {
      this.isVisible.set(true);
    }
  }

  private shouldShowBanner(): boolean {
    const dismissed = localStorage.getItem(this.localStorageKey);
    return this.isMobile() && !dismissed;
  }

  close() {
    this.isVisible.set(false);
    localStorage.setItem(this.localStorageKey, 'true');
  }

  private isMobile(): boolean {
    return true;
/*    if (typeof navigator === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);*/
  }
}
