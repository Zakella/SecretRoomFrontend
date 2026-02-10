import {Component, inject} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Loader} from './shared/components/loader/loader';
import {Toast} from 'primeng/toast';
import {ThemeKey} from './@core/theme/theme.model';
import {ThemeService} from './@core/theme/theme.service';
import {Language} from './@core/services/language';
import {CookieBanner} from './shared/components/cookie-banner/cookie-banner';
import {GoogleAnalytics} from './@core/services/google-analytics';
import {filter} from 'rxjs';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loader, Toast, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private themeService = inject(ThemeService)
  private lang = inject(Language)
  private router = inject(Router)
  private ga = inject(GoogleAnalytics)

  constructor() {
    this.lang.init();
    this.themeService.init()
    this.trackPageViews();
  }

  private trackPageViews() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.ga.sendPageView(event.urlAfterRedirects);
    });
  }
}
