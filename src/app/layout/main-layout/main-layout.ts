import {Component, computed, inject} from '@angular/core';
import {Header} from '../header/header';
import {Footer} from '../footer/footer';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {Cart} from '../../shared/components/cart/cart';
import {Loader} from '../../shared/components/loader/loader';
import {CartUi} from '../../shared/components/cart/services/cart';
import {TranslocoService} from '@ngneat/transloco';
import {distinctUntilChanged, filter, map} from 'rxjs';
import {ScrollTop} from '../../shared/components/scroll-top/scroll-top';
import {MobileMenu} from '../mobile-menu/mobile-menu';

@Component({
  selector: 'app-main-layout',
  imports: [
    Header,
    Footer,
    RouterOutlet,
    Cart,
    Loader,
    ScrollTop,
    MobileMenu,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  private cartService = inject(CartUi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private translateService = inject(TranslocoService);


  public readonly visible = computed(() => this.cartService.visible());


  constructor() {
    this.initializeMetaTags();
  }

  public initializeMetaTags() {
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        map(() => this.route.firstChild?.snapshot.paramMap.get('lang')),
        distinctUntilChanged()
      )
      .subscribe(lang => {
        const currentLang = (lang && ['ru', 'ro'].includes(lang)) ? lang : 'ru';
        this.translateService.setActiveLang(currentLang);
        /*        const meta = META_INFO[currentLang];
                if (meta) {
                  this.updateMetaTags(currentLang, meta.title, meta.description, meta.keywords);
                }*/
      });
  }

  public onClose() {
    this.cartService.close();
  }
}
