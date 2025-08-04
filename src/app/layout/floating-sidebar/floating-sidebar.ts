import {Component, inject} from '@angular/core';
import {CartUi} from '../../shared/components/cart/services/cart';

@Component({
  selector: 'app-floating-sidebar',
  imports: [],
  templateUrl: './floating-sidebar.html',
  styleUrl: './floating-sidebar.scss'
})
export class FloatingSidebar {
  private cartService = inject(CartUi);
  visibleCart = this.cartService.visible;

  openCart() {
    this.cartService.open();
  }
  cartCount = 1;
  hasGift = true; // или подставляй реальное значение из сервиса

}
