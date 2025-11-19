import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {DecimalPipe, NgTemplateOutlet} from '@angular/common';
import {CartUi} from './services/cart'
import {CartItem} from '../../../entities/cart-item';
import {Subject} from 'rxjs';
import {Router} from '@angular/router';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-cart',
  imports: [
    FormsModule,
    DecimalPipe,
    NgTemplateOutlet,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cart  implements OnInit, OnDestroy{
  @Output() close = new EventEmitter<void>();
  private cartService = inject(CartUi);
  cartItems: CartItem[] = [];
  totalAmount: number = 0;
  totalQuantity: number = 0;
  private ngUnsubscribe = new Subject<void>();
  @Input() shippingCost: number = 0;
  isLoading: boolean = false;
  private router = inject(Router);
  cartItem = {
    title: 'REPAIR MASK',
    quantity: 1,
    price: 627,
    image: '/assets/images/demo/slider1.jpeg'
  };
  suggestions = [
    {
      title: 'ESSENTIAL FACE WIPES - 5 PACK',
      price: 120,
      image: '/assets/images/demo/slider1.jpeg'
    },
    {
      title: 'ACTIVE GLOW BLUEBERRY',
      price: 351,
      image: '/assets/images/demo/slider1.jpeg'
    },
    {
      title: 'BUFF MASSAGING SCALP BRUSH',
      price: 296,
      image: '/assets/images/demo/slider1.jpeg'
    }
  ];
  giftWrap = false;
  freeShippingThreshold = 861;


  ngOnInit(): void {
    this.subscribeToCartItems();
    this.subscribeToTotalAmount();
    this.subscribeToTotalQuantity();
    this.subscribeToCartModification();
    this.cartService.computeCartTotals();
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  private subscribeToCartItems() {
    this.cartService.cartItems.pipe(takeUntil(this.ngUnsubscribe)).subscribe(items => this.cartItems = items);
  }

  private subscribeToCartModification() {
    this.cartService.cartModified.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
      (data) => {
        if (data) {
          this.cartService.computeCartTotals();
        }
      }
    )
  }

  private subscribeToTotalAmount() {
    this.cartService.totalAmount.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
      (data) => {
        this.totalAmount = data;
      }
    )

  }

  private subscribeToTotalQuantity() {
    this.cartService.totalQuantity.pipe(takeUntil(this.ngUnsubscribe)).subscribe(
      (data) => {
        this.totalQuantity = data;
      }
    )
  }

  deleteItemFromCart(index: number) {
    this.cartService.deleteItemFromCart(index);
  }

  recalculateCartItem(cartItem: CartItem, index: number) {
    this.cartService.recalculateCartItem(cartItem, index);
  }


  closeDrawer() {
    this.cartService.close();
/*
    this.close.emit();
*/
  }


  get subtotal() {
    return this.cartItem.quantity * this.cartItem.price;
  }

  get freeShippingRemaining() {
    return Math.max(this.freeShippingThreshold - this.subtotal, 0).toFixed(2);
  }

  get shippingProgress() {
    return Math.min((this.subtotal / this.freeShippingThreshold) * 100, 100);
  }
}
