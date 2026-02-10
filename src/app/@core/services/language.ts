import {inject, Injectable, signal} from '@angular/core';
import {TranslocoService} from '@ngneat/transloco';
import {Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class Language {
  currentLanguage = signal<string>('ro');
  private router = inject(Router);
  private translocateService = inject(TranslocoService);

  public init(): void {
    const lang = this.router.url.split('/')[1] || 'ro';
    this.syncLanguageFromUrl(lang);
  }

  public setLanguage(lang: string): void {
    this.translocateService.setActiveLang(lang);
    this.currentLanguage.set(lang);
    const segments = this.router.url.split('/');
    segments[1] = lang;
    this.router.navigate(segments);
  }

  /**
   * Syncs the language state (signal and Transloco) with the given lang string,
   * but does not cause navigation.
   * @param lang The language string ('ro' or 'ru')
   */
  public syncLanguageFromUrl(lang: string): void {
    if (lang && (lang === 'ro' || lang === 'ru') && this.currentLanguage() !== lang) {
      this.currentLanguage.set(lang);
      this.translocateService.setActiveLang(lang);
    }
  }
}
