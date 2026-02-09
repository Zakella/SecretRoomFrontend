import {Component, inject} from '@angular/core';
import {RouterOutlet} from '@angular/router';
import {Loader} from './shared/components/loader/loader';
import {Toast} from 'primeng/toast';
import {ThemeKey} from './@core/theme/theme.model';
import {ThemeService} from './@core/theme/theme.service';
import {Language} from './@core/services/language';
import {CookieBanner} from './shared/components/cookie-banner/cookie-banner';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loader, Toast, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private themeService = inject(ThemeService)
  private lang = inject(Language)

  constructor() {
    this.lang.init();
    this.themeService.init()
  }
}
