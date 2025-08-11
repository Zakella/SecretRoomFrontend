import {Component, EventEmitter, inject, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe, NgForOf} from '@angular/common';
import {CartUi} from './services/cart'

@Component({
  selector: 'app-cart',
  imports: [
    FormsModule,
    DecimalPipe,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss'
})
export class Cart {
  @Output() close = new EventEmitter<void>();
  private cartService = inject(CartUi);

  closeDrawer() {
    this.cartService.close();
    this.close.emit();
  }

  cartItem = {
    title: 'REPAIR MASK',
    quantity: 1,
    price: 627,
    image: 'https://via.placeholder.com/50x70?text=Mask'
  };

  suggestions = [
    {
      title: 'ESSENTIAL FACE WIPES - 5 PACK',
      price: 120,
      image: 'https://via.placeholder.com/60?text=Wipes'
    },
    {
      title: 'ACTIVE GLOW BLUEBERRY',
      price: 351,
      image: 'https://via.placeholder.com/60?text=Glow'
    },
    {
      title: 'BUFF MASSAGING SCALP BRUSH',
      price: 296,
      image: 'https://via.placeholder.com/60?text=Brush'
    }
  ];

  giftWrap = false;
  freeShippingThreshold = 861;

  get subtotal() {
    return this.cartItem.quantity * this.cartItem.price;
  }

  get freeShippingRemaining() {
    return Math.max(this.freeShippingThreshold - this.subtotal, 0).toFixed(2);
  }

  get shippingProgress() {
    return Math.min((this.subtotal / this.freeShippingThreshold) * 100, 100);
  }

  increaseQty() {
    this.cartItem.quantity++;
  }

  decreaseQty() {
    if (this.cartItem.quantity > 1) {
      this.cartItem.quantity--;
    }
  }

}
