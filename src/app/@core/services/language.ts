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

    this.currentLanguage.set(lang);
    this.translocateService.setActiveLang(lang);
  }


  public setLanguage(lang: string): void {
    this.translocateService.setActiveLang(lang);
    this.currentLanguage.set(lang);
    const segments = this.router.url.split('/');
    segments[1] = lang;
    this.router.navigate(segments);
  }
}
