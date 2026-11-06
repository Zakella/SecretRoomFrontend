import {afterNextRender, ChangeDetectionStrategy, Component, inject, effect, signal} from '@angular/core';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Loader} from './shared/components/loader/loader';
import {Toast} from 'primeng/toast';
import {ThemeService} from './@core/theme/theme.service';
import {Language} from './@core/services/language';
import {CookieBanner} from './shared/components/cookie-banner/cookie-banner';
import {GoogleAnalytics} from './@core/services/google-analytics';
import {MetaService} from './@core/services/meta.service';
import {filter} from 'rxjs';
import {SiteTracker} from './@core/api/site-tracker';
import {Chat} from './widgets/chat/chat';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Loader, Toast, CookieBanner, Chat],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  private themeService = inject(ThemeService)
  private lang = inject(Language)
  private router = inject(Router)
  private ga = inject(GoogleAnalytics)
  private metaService = inject(MetaService)
  private tracker = inject(SiteTracker)
  /** SR-218: the chat exists only in the browser, after hydration — the server markup has no trace of it. */
  protected readonly chatReady = signal(false)

  constructor() {
    afterNextRender(() => this.chatReady.set(true));
    this.ga.init();
    this.lang.init();
    this.themeService.init()
    this.trackPageViews();
    this.tracker.init();

    effect(() => {
      const currentLang = this.lang.currentLanguage();
      this.metaService.updateHtmlLang(currentLang);
    });
  }

  private trackPageViews() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: any) => {
      this.ga.sendPageView(event.urlAfterRedirects);
    });
  }
}
