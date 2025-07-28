import {Component, inject} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {TranslocoService} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  public languages = ['ru', 'ro'];
  langService = inject(Language);
  public  activeLang = this.langService.currentLanguage

  setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }
}
