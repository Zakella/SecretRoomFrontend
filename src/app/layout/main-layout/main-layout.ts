import {Component, computed, DestroyRef, inject} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Header} from '../header/header';
import {Footer} from '../footer/footer';
import {NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Cart} from '../../shared/components/cart/cart';
import {Loader} from '../../shared/components/loader/loader';
import {CartUi} from '../../shared/components/cart/services/cart';
import {filter} from 'rxjs';
import {MobileMenu} from '../mobile-menu/mobile-menu';
import {Breadcrumb} from '../breadcrumb/breadcrumb';
import {MobileHeader} from '../mobile-header/mobile-header';
import {ScrollToTop} from '../../shared/components/scroll-to-top/scroll-to-top';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-main-layout',
  imports: [
    Header,
    Footer,
    RouterOutlet,
    Cart,
    Loader,
    MobileMenu,
    Breadcrumb,
    MobileHeader,
    ScrollToTop,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  private cartService = inject(CartUi);
  private router = inject(Router);
  private langService = inject(Language);
  private destroyRef = inject(DestroyRef);

  public readonly visible = computed(() => this.cartService.visible());

  constructor() {
    this.initializeLanguageSync();
  }

  public initializeLanguageSync() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: NavigationEnd) => {
        // Extract language from URL: /ro/checkout -> ro
        const urlParts = event.urlAfterRedirects.split('/');
        const lang = urlParts[1];

        if (lang && (lang === 'ro' || lang === 'ru')) {
          this.langService.syncLanguageFromUrl(lang);
        }
      });
  }

  public onClose() {
    this.cartService.close();
  }
}
