import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal
} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CartUi} from '../../shared/components/cart/services/cart';
import {CartItem} from '../../entities/cart-item';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, map, takeUntil} from 'rxjs/operators';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Shipping} from '../../@core/api/shipping';
import {ShippingOption} from '../../entities/shipping-options';
import {TranslocoPipe, TranslocoService} from '@ngneat/transloco';
import {InputNumber} from 'primeng/inputnumber';
import {Language} from '../../@core/services/language';
import {LocalizedNamePipe} from '../../shared/pipes/localized-name.pipe';
import {PurchaseService} from '../../@core/api/purchase';
import {Purchase} from '../../entities/purchase';
import {ProductService} from '../../@core/api/product';
import {MessageService} from 'primeng/api';
import {GoogleAnalytics} from '../../@core/services/google-analytics';

type Step = 'information' | 'shipping' | 'payment';

type PaymentMethod = 'OnlinePayment' | 'CashOnDelivery' | 'CardOnDelivery';

@Component({
  selector: 'app-checkout',
  imports: [
    FadeUp,
    FormsModule,
    ReactiveFormsModule,
    TranslocoPipe,
    InputNumber,
    RouterLink,
    LocalizedNamePipe
  ],
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Checkout implements OnInit, OnDestroy {
  step: Step = 'information';
  form!: FormGroup;

  cartItems: CartItem[] = [];
  totalAmount = 0;
  totalQuantity = 0;
  shippingCost = 0;

  shippingOptions: ShippingOption[] = [];
  selectedShippingOption: ShippingOption | null = null;
  availablePaymentMethods: PaymentMethod[] = [];
  selectedPayment: PaymentMethod | null = null;

  isLoading = signal(false);
  isSubmitting = signal(false);
  orderError = signal<string | null>(null);
  shippingError = signal<string | null>(null);

  private fb = inject(FormBuilder);
  private cartService = inject(CartUi);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private shippingService = inject(Shipping);
  private purchaseService = inject(PurchaseService);
  private productService = inject(ProductService);
  private messageService = inject(MessageService);
  private cdr = inject(ChangeDetectorRef);
  private langService = inject(Language);
  private translocoService = inject(TranslocoService);
  private ga = inject(GoogleAnalytics);
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;

  ngOnInit(): void {
    // Ensure language is synced with URL
    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const lang = params['lang'];
      if (lang && (lang === 'ro' || lang === 'ru') && this.activeLang() !== lang) {
        this.langService.setLanguage(lang);
      }
    });

    this.initForm();
    this.loadCart();
    this.subscribeToCartChanges();
    this.validateCart();
    this.trackBeginCheckout();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
      country: [{value: 'Moldova, Republic of', disabled: true}],
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastname: ['', [Validators.required, Validators.minLength(2)]],
      address: ['', [Validators.required, Validators.minLength(3)]],
      city: ['', [Validators.required, Validators.minLength(2)]],
      zip: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
      phone: ['', [Validators.required, Validators.pattern(/^0[67]\d{7}$/)]],
      selectedShipping: ['', Validators.required],
      payment: ['', Validators.required],
      iAgree: [false, Validators.requiredTrue],
      comment: ['']
    });
  }

  private loadCart(): void {
    this.cartItems = this.cartService.loadCartItemsFromStorage();
    if (this.cartItems.length === 0) {
      this.router.navigate([this.activeLang(), 'catalog', 'all']);
      return;
    }
    this.cartService.computeCartTotals();
  }

  private validateCart(): void {
    if (this.cartItems.length === 0) return;

    const checks = this.cartItems.map((item, index) =>
      this.productService.getProductById(item.product.id!).pipe(
        map(() => ({ index, valid: true })),
        catchError(() => of({ index, valid: false }))
      )
    );

    forkJoin(checks).pipe(takeUntil(this.destroy$)).subscribe(results => {
      const invalidIndices = results
        .filter(r => !r.valid)
        .map(r => r.index)
        .sort((a, b) => b - a); // Sort descending to delete from end

      if (invalidIndices.length > 0) {
        invalidIndices.forEach(index => {
          this.cartService.deleteItemFromCart(index);
        });

        this.messageService.add({
          severity: 'warn',
          summary: this.translocoService.translate('checkout.productNotFoundInCart'),
          detail: ''
        });

        if (this.cartItems.length === 0) {
          this.router.navigate([this.activeLang(), 'catalog', 'all']);
        }
      }
    });
  }

  private subscribeToCartChanges(): void {
    this.cartService.cartItems
      .pipe(takeUntil(this.destroy$))
      .subscribe(items => {
        this.cartItems = items;
        this.cdr.markForCheck();
      });

    this.cartService.totalAmount
      .pipe(takeUntil(this.destroy$))
      .subscribe(amount => {
        this.totalAmount = amount;
        this.updateShippingCost();
        this.cdr.markForCheck();
      });

    this.cartService.totalQuantity
      .pipe(takeUntil(this.destroy$))
      .subscribe(qty => {
        this.totalQuantity = qty;
        this.cdr.markForCheck();
      });

    this.cartService.cartModified
      .pipe(takeUntil(this.destroy$))
      .subscribe(modified => {
        if (modified) {
          this.cartService.computeCartTotals();
        }
      });
  }

  private loadShippingOptions(): void {
    this.isLoading.set(true);
    this.shippingError.set(null);

    this.shippingService.getShippingOptions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (options) => {
          this.shippingOptions = options.map(opt => ({
            ...opt,
            expectedDeliveryDescription: this.getDeliveryDateRange(opt.expectedDeliveryFrom, opt.expectedDeliveryTo)
          }));
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.isLoading.set(false);
          this.shippingError.set('errors.serverError');
          this.cdr.markForCheck();
        }
      });
  }

  private getDeliveryDateRange(minDays: number, maxDays: number): string {
    const formatter = new Intl.DateTimeFormat('ru', {day: '2-digit', month: '2-digit', year: 'numeric'});
    const now = new Date();
    const from = new Date(now.getTime() + minDays * 24 * 60 * 60 * 1000);
    const to = new Date(now.getTime() + maxDays * 24 * 60 * 60 * 1000);
    return `${formatter.format(from)} - ${formatter.format(to)}`;
  }

  goTo(step: Step): void {
    if (step === 'shipping' && !this.isInformationValid()) {
      this.markInformationFieldsTouched();
      return;
    }
    if (step === 'payment' && !this.selectedShippingOption) {
      return;
    }

    // Загружаем опции доставки при переходе на шаг shipping (если ещё не загружены)
    if (step === 'shipping' && this.shippingOptions.length === 0) {
      this.loadShippingOptions();
    }

    this.step = step;
  }

  private isInformationValid(): boolean {
    const fields = ['email', 'name', 'lastname', 'address', 'city', 'zip', 'phone'];
    return fields.every(field => this.form.get(field)?.valid);
  }

  private markInformationFieldsTouched(): void {
    const fields = ['email', 'name', 'lastname', 'address', 'city', 'zip', 'phone'];
    fields.forEach(field => this.form.get(field)?.markAsTouched());
  }

  selectShippingOption(option: ShippingOption): void {
    this.selectedShippingOption = option;
    this.form.patchValue({selectedShipping: option.id});
    this.updateShippingCost();
    this.updateAvailablePaymentMethods();
    this.selectedPayment = null;
    this.form.patchValue({payment: ''});
    this.cdr.markForCheck();
  }

  private updateShippingCost(): void {
    if (this.selectedShippingOption) {
      if (this.totalAmount >= this.selectedShippingOption.freeShippingFrom) {
        this.shippingCost = 0;
      } else {
        this.shippingCost = this.selectedShippingOption.cost;
      }
    }
  }

  private updateAvailablePaymentMethods(): void {
    this.availablePaymentMethods = [];
    if (this.selectedShippingOption) {
      if (this.selectedShippingOption.onlinePaymentAvailable) {
        this.availablePaymentMethods.push('OnlinePayment');
      }
      if (this.selectedShippingOption.cashOnDeliveryAvailable) {
        this.availablePaymentMethods.push('CashOnDelivery');
      }
      if (this.selectedShippingOption.cardOnDeliveryAvailable) {
        this.availablePaymentMethods.push('CardOnDelivery');
      }
    }
  }

  selectPaymentMethod(method: PaymentMethod): void {
    this.selectedPayment = method;
    this.form.patchValue({payment: method});
    this.cdr.markForCheck();
  }

  getPaymentLabel(method: PaymentMethod): string {
    return method;
  }

  // Cart management
  updateCartItemQuantity(item: CartItem, index: number): void {
    this.cartService.recalculateCartItem(item, index);
  }

  removeCartItem(index: number): void {
    this.cartService.deleteItemFromCart(index);
    if (this.cartItems.length === 0) {
      this.router.navigate([this.activeLang(), 'catalog', 'all']);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  canSubmit(): boolean {
    return this.form.valid && !this.isSubmitting() && this.cartItems.length > 0;
  }

  onSubmit(): void {
    if (!this.canSubmit()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);

    const formValue = this.form.getRawValue();

    const purchase: Purchase = {
      customer: {
        firstName: formValue.name,
        lastName: formValue.lastname,
        email: formValue.email,
        phone: formValue.phone
      },
      shippingAddress: {
        street: formValue.address,
        city: formValue.city,
        country: formValue.country,
        zipCode: formValue.zip,
        phone: formValue.phone
      },
      order: {
        id: null,
        placementDate: new Date(),
        shippingOption: this.selectedShippingOption!,
        shippingCost: this.shippingCost,
        totalQuantity: this.totalQuantity,
        totalAmount: this.totalAmount,
        totalAmountOrder: this.totalAmount + this.shippingCost
      },
      orderItems: this.cartItems.map(item => ({
        product: item.product,
        sizeType: item.size?.sizeType,
        amount: item.amount,
        quantity: item.quantity
      })),
      comment: formValue.comment || '',
      language: this.translocoService.getActiveLang(),
      payment: this.selectedPayment
    };

    this.orderError.set(null);

    this.purchaseService.placeOrder(purchase)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.isSubmitting.set(false);

          if (response.ok === false) {
            this.orderError.set('errors.serverError');
            this.cdr.markForCheck();
            return;
          }

          this.cartService.clearCart();

          if (response.waitingForPayment && response.paymentUrl) {
            window.location.href = response.paymentUrl;
          } else {
            this.router.navigate(['/', this.activeLang(), 'order-success', response.orderTrackingNumber]);
          }
        },
        error: (error) => {
          console.error('Order placement failed:', error);
          this.isSubmitting.set(false);

          const errorMessage = error.error?.message || '';

          if (errorMessage.includes('Product with id')) {
            this.orderError.set('checkout.productNotFoundInCart');
            // Trigger validation again to remove the bad product
            this.validateCart();
          } else if (error.status === 0) {
            this.orderError.set('errors.serverError');
          } else if (error.status >= 500) {
            this.orderError.set('errors.serverError');
          } else if (errorMessage) {
            this.orderError.set(errorMessage);
          } else {
            this.orderError.set('errors.serverError');
          }

          this.cdr.markForCheck();
        }
      });
  }

  get grandTotal(): number {
    return this.totalAmount + this.shippingCost;
  }

  dismissError(): void {
    this.orderError.set(null);
  }

  retryLoadShipping(): void {
    this.shippingError.set(null);
    this.loadShippingOptions();
  }

  private trackBeginCheckout() {
    this.ga.send({
      event: 'begin_checkout',
      category: 'ecommerce',
      value: this.totalAmount
    });
  }
}
