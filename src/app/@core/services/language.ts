import {inject, Injectable, signal} from '@angular/core';
import {TranslocoService} from '@ngneat/transloco';
import {NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class Language {
  currentLanguage = signal<string>('ro');
  private router = inject(Router);
  private translocateService = inject(TranslocoService);

  /**
   * Достаёт языковой сегмент из URL.
   * Строку запроса и якорь надо отрезать ДО разбора: на главной параметр клеится
   * прямо к языковому сегменту («/ru?fbclid=…» → «ru?fbclid=…»), такого языка нет,
   * и страница отрисовывается на языке по умолчанию. На вложенных путях параметр
   * попадает в последний сегмент и потому не мешал — баг был виден только на главной,
   * зато на ней же и приходит весь трафик из Instagram и рекламы.
   */
  private langFromUrl(url: string): string {
    return url.split('#')[0].split('?')[0].split('/')[1] || 'ro';
  }

  public init(): void {
    this.syncLanguageFromUrl(this.langFromUrl(this.router.url));

    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.syncLanguageFromUrl(this.langFromUrl(event.urlAfterRedirects));
      });
  }

  public setLanguage(lang: string): void {
    this.translocateService.setActiveLang(lang);
    this.currentLanguage.set(lang);
    // По той же причине режем путь без строки запроса: иначе последний сегмент
    // уезжает в навигацию вместе с «?page=2» и получается несуществующий адрес.
    const segments = this.router.url.split('#')[0].split('?')[0].split('/');
    segments[1] = lang;
    this.router.navigate(segments, { queryParamsHandling: 'preserve' });
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
