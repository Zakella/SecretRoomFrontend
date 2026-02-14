import {ChangeDetectionStrategy, Component, inject, OnInit, PLATFORM_ID} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Meta} from '@angular/platform-browser';
import {RESPONSE_INIT} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {TranslocoPipe} from '@ngneat/transloco';
import {MetaService} from '../../../@core/services/meta.service';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-notfound',
  imports: [
    RouterLink,
    TranslocoPipe,
  ],
  templateUrl: './notfound.html',
  styleUrl: './notfound.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Notfound implements OnInit {
  private metaService = inject(MetaService);
  private meta = inject(Meta);
  public langService = inject(Language);
  public activeLang = this.langService.currentLanguage;

  constructor() {
    const platformId = inject(PLATFORM_ID);
    if (isPlatformServer(platformId)) {
      const response = inject(RESPONSE_INIT, {optional: true});
      if (response) {
        response.status = 404;
        response.statusText = 'Not Found';
      }
    }
  }

  ngOnInit() {
    const isRo = this.activeLang() === 'ro';
    this.metaService.updateTitle(
      isRo ? 'Pagina nu a fost găsită — 404 | Secret Room' : 'Страница не найдена — 404 | Secret Room'
    );
    this.metaService.updateDescription(
      isRo
        ? 'Pagina pe care o căutați nu există. Reveniți la pagina principală Secret Room Moldova.'
        : 'Страница, которую вы ищете, не существует. Вернитесь на главную Secret Room Moldova.'
    );
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
  }
}
