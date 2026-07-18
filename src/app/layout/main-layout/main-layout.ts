import {Component, computed, inject} from '@angular/core';
import {Header} from '../header/header';
import {Footer} from '../footer/footer';
import {RouterOutlet} from '@angular/router';
import {Cart} from '../../shared/components/cart/cart';
import {Loader} from '../../shared/components/loader/loader';
import {CartUi} from '../../shared/components/cart/services/cart';
import {MobileMenu} from '../mobile-menu/mobile-menu';
import {Breadcrumb} from '../breadcrumb/breadcrumb';
import {MobileHeader} from '../mobile-header/mobile-header';
import {ScrollToTop} from '../../shared/components/scroll-to-top/scroll-to-top';

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

  public readonly visible = computed(() => this.cartService.visible());

  public onClose() {
    this.cartService.close();
  }
}
