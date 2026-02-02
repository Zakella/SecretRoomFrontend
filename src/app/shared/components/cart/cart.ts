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
import {TranslocoPipe} from '@ngneat/transloco';
import {InputNumber} from 'primeng/inputnumber';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-cart',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    TranslocoPipe,
    InputNumber,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cart implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  private cartService = inject(CartUi);
  cartItems: CartItem[] = [];
  totalAmount: number = 0;
  totalQuantity: number = 0;
  private ngUnsubscribe = new Subject<void>();
  @Input() shippingCost: number = 0;
  private router = inject(Router);
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
  freeShippingThreshold = 861;
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage


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

  protected deleteItemFromCart(index: number): void {
    this.cartService.deleteItemFromCart(index);
  }

  protected recalculateCartItem(cartItem: CartItem, index: number): void {
    this.cartService.recalculateCartItem(cartItem, index);
  }


  protected closeDrawer(): void {
    this.cartService.close();
  }


  get freeShippingRemaining() {
    return null
    /*
        return Math.max(this.freeShippingThreshold - this.subtotal, 0).toFixed(2);
    */
  }

  get shippingProgress() {
    return null
    /*
        return Math.min((this.subtotal / this.freeShippingThreshold) * 100, 100);
    */
  }

  protected navToProduct(id: string| undefined): void {
    if (!id)return

    this.router.navigate([this.activeLang(), 'product-detail', id]).then(
      () => {
        this.closeDrawer();
      }
    );
  }

  protected navigateToCheckout(): void {
    if (this.cartItems.length === 0) return;

    this.router.navigate([this.activeLang(), 'checkout']).then(
      () => {
        this.closeDrawer();
      }
    );
  }
}
