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
import {Router} from '@angular/router';
import {takeUntil} from 'rxjs/operators';
import {TranslocoPipe} from '@ngneat/transloco';
import {InputNumber} from 'primeng/inputnumber';
import {Language} from '../../../@core/services/language';
import {Slugify} from '../../../@core/services/slugify';
import {Product} from '../../../entities/product';
import {LocalizedNamePipe} from '../../pipes/localized-name.pipe';
import {Shipping} from '../../../@core/api/shipping';
import {ShippingOption} from '../../../entities/shipping-options';
import {ProductPrice} from '../product/product-price/product-price';
import {RecommendedProductService} from '../product/recommended-products/recommended-product-service';

@Component({
  selector: 'app-cart',
  imports: [
    FormsModule,
    NgTemplateOutlet,
    TranslocoPipe,
    InputNumber,
    LocalizedNamePipe,
    ProductPrice,
  ],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cart implements OnInit, OnDestroy {
  @Output() close = new EventEmitter<void>();
  private cartService = inject(CartUi);
  private shippingService = inject(Shipping);
  private recommendedService = inject(RecommendedProductService);
  private cdr = inject(ChangeDetectorRef);
  cartItems: CartItem[] = [];
  totalAmount: number = 0;
  totalQuantity: number = 0;
  private ngUnsubscribe = new Subject<void>();
  @Input() shippingCost: number = 0;
  private router = inject(Router);
  recommendations = signal<Product[]>([]);

  freeShippingThreshold = signal<number>(0);
  shippingOptionsLoaded = signal<boolean>(false);

  private langService = inject(Language);
  private slugify = inject(Slugify);
  public activeLang = this.langService.currentLanguage


  ngOnInit(): void {
    this.subscribeToCartItems();
    this.subscribeToTotalAmount();
    this.subscribeToTotalQuantity();
    this.subscribeToCartModification();
    this.cartService.computeCartTotals();
    this.loadShippingOptions();
    this.loadRecommendations();
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
          this.loadRecommendations();
        }
      }
    )
  }

  private loadRecommendations(): void {
    const appIds = this.cartItems
      .map(item => Number(item.product.id))
      .filter(id => !isNaN(id) && id > 0);

    if (appIds.length === 0) {
      this.recommendations.set([]);
      return;
    }

    this.recommendedService.getCartRecommendations(appIds)
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe({
        next: (products) => {
          this.recommendations.set(products);
          this.cdr.markForCheck();
        },
        error: () => {
          this.recommendations.set([]);
          this.cdr.markForCheck();
        }
      });
  }

  protected addRecommendationToCart(product: Product): void {
    const cartItem = new CartItem(product, 1);
    this.cartService.addToCart(cartItem);
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

  protected getItemMaxStock(cartItem: CartItem): number {
    return this.cartService.getMaxStock(cartItem) || 100;
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

  protected navToProduct(product: Product): void {
    if (!product.id) return;
    this.router.navigate(this.slugify.productUrl(this.activeLang(), product.id, product.name ?? '')).then(
      () => this.closeDrawer()
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
