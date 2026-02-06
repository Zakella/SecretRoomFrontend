import {Component, inject, signal} from '@angular/core';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';
import {CartUi} from '../../shared/components/cart/services/cart';
import {Language} from '../../@core/services/language';
import {UpperCasePipe} from '@angular/common';

@Component({
  selector: 'mobile-header',
  imports: [
    UpperCasePipe
  ],
  templateUrl: './mobile-header.html',
  styleUrl: './mobile-header.scss'
})
export class MobileHeader {
  private router = inject(Router);
  private cartService = inject(CartUi);
  private langService = inject(Language);

  isHome = signal(true);
  cartCount = this.cartService.cartCount;
  activeLang = this.langService.currentLanguage;
  languages = ['ru', 'ro'];

  constructor() {
    // Initial check
    this.checkRoute();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.checkRoute();
    });
  }

  private checkRoute() {
    const url = this.router.url;
    const parts = url.split('/').filter(p => p);
    // Home is root or just lang prefix (e.g. /ru)
    this.isHome.set(parts.length <= 1);
  }

  goBack() {
    window.history.back();
  }

  openCart() {
    this.cartService.open();
  }

  setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }
}
