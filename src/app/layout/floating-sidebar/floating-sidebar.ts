import {Component, inject} from '@angular/core';
import {CartUi} from '../../shared/components/cart/services/cart';
import {RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-floating-sidebar',
  imports: [
    RouterLink
  ],
  templateUrl: './floating-sidebar.html',
  styleUrl: './floating-sidebar.scss'
})
export class FloatingSidebar {
  private cartService = inject(CartUi);
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage

  visibleCart = this.cartService.visible;

  openCart() {
    this.cartService.open();
  }
  cartCount = 1;
  hasGift = true;

}
