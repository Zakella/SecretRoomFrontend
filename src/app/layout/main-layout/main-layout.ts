import {Component, computed, inject} from '@angular/core';
import {Header} from '../header/header';
import {Footer} from '../footer/footer';
import {RouterOutlet} from '@angular/router';
import {Cart} from '../../shared/components/cart/cart';
import {AddedToCartToast} from '../../shared/components/cart/added-to-cart/added-to-cart';
import {QuickSizePicker} from '../../shared/components/cart/quick-size-picker/quick-size-picker';
import {Loader} from '../../shared/components/loader/loader';
import {CartUi} from '../../shared/components/cart/services/cart';
import {MobileMenu} from '../mobile-menu/mobile-menu';
import {Breadcrumb} from '../breadcrumb/breadcrumb';
import {MobileHeader} from '../mobile-header/mobile-header';
import {ScrollToTop} from '../../shared/components/scroll-to-top/scroll-to-top';
import {StoreHoldDialog} from '../../widgets/store-hold/store-hold-dialog';
import {StoreHoldState} from '../../widgets/store-hold/store-hold-state';

@Component({
  selector: 'app-main-layout',
  imports: [
    Header,
    Footer,
    RouterOutlet,
    Cart,
    AddedToCartToast,
    QuickSizePicker,
    Loader,
    MobileMenu,
    Breadcrumb,
    MobileHeader,
    ScrollToTop,
    StoreHoldDialog,
  ],
  templateUrl: './main-layout.html',
  styleUrl: './main-layout.scss'
})
export class MainLayout {
  private cartService = inject(CartUi);
  private holdState = inject(StoreHoldState);

  public readonly visible = computed(() => this.cartService.visible());
  /** The hold dialog (PrimeNG Dialog) is loaded on first use, outside the initial bundle (SR-223). */
  protected readonly holdRequested = computed(() => !!this.holdState.request());

  public onClose() {
    this.cartService.close();
  }
}
