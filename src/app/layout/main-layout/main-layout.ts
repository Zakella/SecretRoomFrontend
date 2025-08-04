import {Component, computed, inject} from '@angular/core';
import {Header} from '../header/header';
import {Footer} from '../footer/footer';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Cart} from '../../shared/components/cart/cart';
import {CookieBanner} from '../cookie-banner/cookie-banner';
import {Loader} from '../../shared/components/loader/loader';
import {CartUi} from '../../shared/components/cart/services/cart';
import {TranslocoService} from '@ngneat/transloco';
import {Notify} from '../../@core/services/notify';
import {distinctUntilChanged, filter, map} from 'rxjs';
import {FloatingSidebar} from '../floating-sidebar/floating-sidebar';
import {ScrollTop} from '../../shared/components/scroll-top/scroll-top';

@Component({
  selector: 'app-main-layout',
  imports: [
    Header,
    Footer,
    RouterOutlet,
    Cart,
    CookieBanner,
    Loader,
    FloatingSidebar,
    ScrollTop
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  private cartService = inject(CartUi);
  visible = computed(() => this.cartService.visible());

  onClose() {
    this.cartService.close();
  }

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslocoService);
  notify = inject(Notify)

  constructor() {
    this.initializeMetaTags();
    this.notify.success('Language changed to ');

  }

  public initializeMetaTags() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.route.firstChild?.snapshot.paramMap.get('lang')),
        distinctUntilChanged()
      )
      .subscribe(lang => {
        const currentLang = (lang && ['ru', 'ro'].includes(lang)) ? lang : 'en';
        this.translateService.setActiveLang(currentLang);
        /*        const meta = META_INFO[currentLang];
                if (meta) {
                  this.updateMetaTags(currentLang, meta.title, meta.description, meta.keywords);
                }*/
      });
  }

}
