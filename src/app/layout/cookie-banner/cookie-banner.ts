import {Component, inject, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {Cookie} from '../../@core/services/cookie';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-cookie-banner',
  imports: [],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss'
})
export class CookieBanner implements OnInit{
  private cookieService = inject(Cookie);
  accepted = this.cookieService.accepted;

  accept() {
    this.cookieService.acceptCookies();
  }

  showBanner = signal(true);
  private platformId = inject(PLATFORM_ID);

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      // проверяем только на клиенте
      const accepted = localStorage.getItem('cookiesAccepted') === 'true';
      if (accepted) this.showBanner.set(false);
    }
  }

  acceptCookies() {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('cookiesAccepted', 'true');
    }
    this.showBanner.set(false);
  }

  openSettings() {
    alert('Здесь можно открыть модальное окно с настройками cookies');
  }
}
