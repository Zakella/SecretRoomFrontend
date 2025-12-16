import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser, DOCUMENT } from '@angular/common';
import { ThemeKey } from './theme.model';
import { THEMES } from './theme.config';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private linkEl?: HTMLLinkElement;
  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: object,
    @Inject(DOCUMENT) private document: Document
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  setTheme(theme: ThemeKey) {
    if (!this.isBrowser) return; // ⛔ SSR

    localStorage.setItem('theme', theme);

    if (this.linkEl) {
      this.document.head.removeChild(this.linkEl);
      this.linkEl = undefined;
    }

    const href = THEMES[theme];
    if (!href) return;

    const link = this.document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-theme', theme);

    this.document.head.appendChild(link);
    this.linkEl = link;
  }

  init() {
    if (!this.isBrowser) return; // ⛔ SSR

    const auto = this.getHolidayTheme();
    const saved = localStorage.getItem('theme') as ThemeKey | null;

    this.setTheme(auto ?? saved ?? 'default');
  }

  getHolidayTheme(): ThemeKey | null {
    // Date на сервере разрешён, но логика может отличаться по таймзоне
    const now = new Date();
    const month = now.getMonth();
    const day = now.getDate();

    // Black Friday (пример)
    if (month === 10 && day >= 24) {
      return 'black-friday';
    }

    // Новый год
    if (month === 11 || month === 0) {
      return 'new-year';
    }

    // 8 марта
    if (month === 2 && day === 8) {
      return 'march-8';
    }

    return null;
  }
}
