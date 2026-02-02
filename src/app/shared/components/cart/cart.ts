import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  EventEmitter,
  inject,
  Input,
  OnDestroy,
  OnInit,
  Output,
  signal
} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgTemplateOutlet} from '@angular/common';
import {CartUi} from './services/cart'
import {CartItem} from '../../../entities/cart-item';
import {Subject} from 'rxjs';
import {Router, RouterLink} from '@angular/router';
import {takeUntil} from 'rxjs/operators';
import {TranslocoPipe} from '@ngneat/transloco';
import {InputNumber} from 'primeng/inputnumber';
import {Language} from '../../../@core/services/language';
import {Shipping} from '../../../@core/api/shipping';
import {ShippingOption} from '../../../entities/shipping-options';

@Component({
  selector: 'app-cart',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    TranslocoPipe,
    InputNumber,
    RouterLink
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cart implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  private cartService = inject(CartUi);
  private shippingService = inject(Shipping);
  private cdr = inject(ChangeDetectorRef);
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

  freeShippingThreshold = signal<number>(0);
  shippingOptionsLoaded = signal<boolean>(false);

  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage


  ngOnInit(): void {
    this.subscribeToCartItems();
    this.subscribeToTotalAmount();
    this.subscribeToTotalQuantity();
    this.subscribeToCartModification();
    this.cartService.computeCartTotals();
    this.loadShippingOptions();
  }

  private loadShippingOptions(): void {
    this.shippingService.getShippingOptions()
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (options: ShippingOption[]) => {
          const validThresholds = options
            .map(opt => opt.freeShippingFrom)
            .filter(threshold => threshold > 0);

          if (validThresholds.length > 0) {
            this.freeShippingThreshold.set(Math.min(...validThresholds));
          }
          this.shippingOptionsLoaded.set(true);
          this.cdr.markForCheck();
        },
        error: () => {
          this.shippingOptionsLoaded.set(true);
          this.cdr.markForCheck();
        }
      });
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


  get freeShippingRemaining(): number {
    const threshold = this.freeShippingThreshold();
    if (threshold <= 0) return 0;
    return Math.max(threshold - this.totalAmount, 0);
  }

  get shippingProgress(): number {
    const threshold = this.freeShippingThreshold();
    if (threshold <= 0) return 0;
    return Math.min((this.totalAmount / threshold) * 100, 100);
  }

  get hasFreeShipping(): boolean {
    return this.freeShippingRemaining === 0 && this.freeShippingThreshold() > 0;
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
