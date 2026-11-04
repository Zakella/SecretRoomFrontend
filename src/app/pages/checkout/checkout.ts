import {
  afterNextRender,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  HostListener,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  signal
} from '@angular/core';
import {isPlatformBrowser, NgTemplateOutlet} from '@angular/common';
import {FadeUp} from '../../@core/directives/fade-up';
import {FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {CartUi} from '../../shared/components/cart/services/cart';
import {CartItem} from '../../entities/cart-item';
import {forkJoin, of, Subject} from 'rxjs';
import {catchError, map, takeUntil} from 'rxjs/operators';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Meta} from '@angular/platform-browser';
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
import {ProductPrice} from '../../shared/components/product/product-price/product-price';
import {Slugify} from '../../@core/services/slugify';
import {MetaService} from '../../@core/services/meta.service';
import {OrderCreateFailure, SiteEvents} from '../../@core/api/site-events';
import {SiteTracker} from '../../@core/api/site-tracker';
import {PendingPayment} from '../../shared/components/cart/services/pending-payment';
import {SrTrack} from '../../@core/directives/sr-track';

/** Above this many items the order summary list gets its own scroll. */
export const SUMMARY_MANY_ITEMS_THRESHOLD = 8;
/** Above this many items the order summary card stops being sticky. */
export const SUMMARY_STATIC_ITEMS_THRESHOLD = 3;
const NO_IMAGE = 'assets/images/no-image.png';

/** Detail of a 409 PRODUCT_UNAVAILABLE response (master appId, variantAppId may be null). */
export interface UnavailableProduct {
  appId?: number | string | null;
  productId?: number | string | null;
  variantAppId?: number | null;
  productName?: string;
}

type Step = 'information' | 'shipping' | 'payment';

type PaymentMethod = 'OnlinePayment' | 'CashOnDelivery' | 'CardOnDelivery';

/** Validated form controls in on-screen order, with the step that renders each and the element to focus. */
const VALIDATED_FIELDS = [
  {field: 'email', step: 'information', elementId: 'email'},
  {field: 'phone', step: 'information', elementId: 'phone'},
  {field: 'name', step: 'information', elementId: 'name'},
  {field: 'lastname', step: 'information', elementId: 'lastname'},
  {field: 'address', step: 'information', elementId: 'address'},
  {field: 'city', step: 'information', elementId: 'city'},
  {field: 'zip', step: 'information', elementId: 'zip'},
  {field: 'selectedShipping', step: 'shipping', elementId: 'shipping-options'},
  {field: 'payment', step: 'payment', elementId: 'payment-options'},
  {field: 'iAgree', step: 'payment', elementId: 'iAgree'},
] as const satisfies readonly {field: string; step: Step; elementId: string}[];

export type CheckoutField = typeof VALIDATED_FIELDS[number]['field'];

/** Order in which a control's errors are reported: the first one present wins. */
const RULE_ORDER = ['required', 'pattern', 'minlength'] as const;

/** A violated validation rule of one field, resolved to translation keys. */
export interface FieldError {
  field: CheckoutField;
  rule: typeof RULE_ORDER[number];
  /** Full message under the field: what is wrong and how to fix it. */
  key: string;
  /** Short reason for the list under the submit button. */
  shortKey: string;
  labelKey: string;
  params: Record<string, unknown>;
}

/** Why a step button ("Place order", "Continue to payment") is disabled, shown under it. */
export type SubmitHint =
  | {kind: 'fields'; titleKey: string; errors: FieldError[]}
  | {kind: 'message'; key: string};

@Component({
  selector: 'app-checkout',
  imports: [
    FadeUp,
    NgTemplateOutlet,
    FormsModule,
    ReactiveFormsModule,
    TranslocoPipe,
    InputNumber,
    RouterLink,
    LocalizedNamePipe,
    ProductPrice,
    SrTrack
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
  unavailable = signal<UnavailableProduct[]>([]);

  private fb = inject(FormBuilder);
  private meta = inject(Meta);
  private metaService = inject(MetaService);
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
  private platformId = inject(PLATFORM_ID);
  private slugify = inject(Slugify);
  private siteEvents = inject(SiteEvents);
  private tracker = inject(SiteTracker);
  private pendingPayment = inject(PendingPayment);
  private injector = inject(Injector);
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;

  readonly noImage = NO_IMAGE;
  readonly manyItemsThreshold = SUMMARY_MANY_ITEMS_THRESHOLD;
  readonly staticItemsThreshold = SUMMARY_STATIC_ITEMS_THRESHOLD;

  itemUrl(item: CartItem): string[] {
    return this.slugify.productUrl(this.activeLang(), item.product.id!, item.product.name ?? '');
  }

  onItemImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (img.getAttribute('src') !== NO_IMAGE) {
      img.src = NO_IMAGE;
    }
  }

  ngOnInit(): void {
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
    this.setPageTitle(this.activeLang());
    // Ensure language is synced with URL
    this.route.parent?.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const lang = params['lang'];
      if (lang === 'ro' || lang === 'ru') this.setPageTitle(lang);
      if (lang && (lang === 'ro' || lang === 'ru') && this.activeLang() !== lang) {
        this.langService.setLanguage(lang);
      }
    });

    this.initForm();
    this.loadCart();
    this.subscribeToCartChanges();
    this.validateCart();
    this.trackBeginCheckout();
    this.reconcilePendingPayment();
  }

  /** Back from MAIB with an order awaiting payment: once it is paid the cart is cleared — leave checkout. */
  private reconcilePendingPayment(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.pendingPayment.reconcile()
      .pipe(takeUntil(this.destroy$))
      .subscribe(outcome => {
        if (outcome === 'paid' && this.cartItems.length === 0) {
          this.router.navigate(['/', this.activeLang()]);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm(): void {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.pattern(/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/)]],
      country: [{value: 'Moldova, Republic of', disabled: true}],
      name: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s'-]+$/)]],
      lastname: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[A-Za-z\s'-]+$/)]],
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

  private setPageTitle(lang: string): void {
    this.metaService.updateTitle(
      lang === 'ru' ? 'Оформление заказа | Secret Room' : 'Finalizarea comenzii | Secret Room'
    );
  }

  private loadCart(): void {
    this.cartItems = this.cartService.loadCartItemsFromStorage();
    if (this.cartItems.length === 0) {
      // On the server the cart (localStorage) is always empty — redirecting there would
      // bounce every direct visit / F5 on /checkout to the home page.
      if (isPlatformBrowser(this.platformId)) {
        this.router.navigate(['/', this.activeLang()]);
      }
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
          this.router.navigate(['/', this.activeLang()]);
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
        this.cdr.detectChanges();
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
          this.updateShippingCost();
          this.cdr.detectChanges();
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
    const formatter = new Intl.DateTimeFormat(this.activeLang(), {day: '2-digit', month: '2-digit', year: 'numeric'});
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
  getItemMaxStock(item: CartItem): number {
    return this.cartService.getMaxStock(item) || 100;
  }

  updateCartItemQuantity(item: CartItem, index: number): void {
    this.cartService.recalculateCartItem(item, index);
    this.updateShippingCost();
    this.cdr.detectChanges();
  }

  removeCartItem(index: number): void {
    this.cartService.deleteItemFromCart(index);
    this.updateShippingCost();
    this.cdr.detectChanges();
    if (this.cartItems.length === 0) {
      this.router.navigate(['/', this.activeLang()]);
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  canSubmit(): boolean {
    return this.form.valid && !this.isSubmitting() && this.cartItems.length > 0 && !this.hasUnavailableItems();
  }

  /** First violated rule of the field (required → pattern → minlength), or null when it is valid. */
  fieldError(field: CheckoutField): FieldError | null {
    const errors = this.form.get(field)?.errors;
    if (!errors) return null;
    const rule = RULE_ORDER.find(r => errors[r]);
    if (!rule) return null;
    const min = errors['minlength']?.requiredLength;
    return {
      field,
      rule,
      key: `checkout.validation.${field}.${rule}`,
      shortKey: `checkout.submitHint.${field}.${rule}`,
      labelKey: `checkout.fields.${field}`,
      params: min != null ? {min} : {},
    };
  }

  /** Every invalid field (only those of `step` when given), in on-screen order. */
  blockingFields(step?: Step): FieldError[] {
    return VALIDATED_FIELDS
      .filter(f => !step || f.step === step)
      .map(({field}) => this.fieldError(field))
      .filter((e): e is FieldError => e !== null);
  }

  /**
   * What keeps "Place order" disabled. Field problems are listed only once the buyer has
   * interacted with the form (any field touched or dirty) — a fresh form gets no wall of errors.
   */
  submitHint(): SubmitHint | null {
    if (this.canSubmit() || this.isSubmitting()) return null;
    if (this.cartItems.length === 0) return {kind: 'message', key: 'checkout.submitHint.emptyCart'};
    // The order error banner already explains unavailable items and offers to remove them.
    if (this.hasUnavailableItems() && !this.orderError()) {
      return {kind: 'message', key: 'checkout.submitHint.unavailable'};
    }
    return this.fieldsHint('checkout.submitHint.title');
  }

  /** What keeps "Continue to payment" disabled: the shipping step's own fields, same display rules. */
  continueHint(): SubmitHint | null {
    if (this.selectedShippingOption) return null;
    return this.fieldsHint('checkout.submitHint.continueTitle', 'shipping');
  }

  /** Invalid fields (of `step`, or all) — only once the buyer has interacted with the form. */
  private fieldsHint(titleKey: string, step?: Step): SubmitHint | null {
    if (!this.form.touched && !this.form.dirty) return null;
    const errors = this.blockingFields(step);
    return errors.length ? {kind: 'fields', titleKey, errors} : null;
  }

  /** Opens the step with the field, marks the form touched (fields turn red) and focuses the field. */
  goToField(field: CheckoutField): void {
    const target = VALIDATED_FIELDS.find(f => f.field === field);
    if (!target) return;
    this.form.markAllAsTouched();
    if (target.step === 'shipping' && this.shippingOptions.length === 0 && !this.isLoading()) {
      this.loadShippingOptions();
    }
    this.step = target.step;
    this.cdr.markForCheck();
    if (!isPlatformBrowser(this.platformId)) return;
    afterNextRender(() => {
      const el = document.getElementById(target.elementId);
      if (!el) return;
      el.scrollIntoView({behavior: 'smooth', block: 'center'});
      el.focus({preventScroll: true});
    }, {injector: this.injector});
  }

  isUnavailable(item: CartItem): boolean {
    return this.unavailable().some(d => {
      const id = d.appId ?? d.productId;
      if (id == null || String(item.product.id) !== String(id)) return false;
      return d.variantAppId == null || item.variantAppId === d.variantAppId;
    });
  }

  hasUnavailableItems(): boolean {
    return this.cartItems.some(item => this.isUnavailable(item));
  }

  /** Removes from the cart every item the backend reported as no longer available. */
  removeUnavailableItems(): void {
    for (let i = this.cartItems.length - 1; i >= 0; i--) {
      if (this.isUnavailable(this.cartItems[i])) {
        this.cartService.deleteItemFromCart(i);
      }
    }
    this.unavailable.set([]);
    this.orderError.set(null);
    this.updateShippingCost();
    this.cdr.detectChanges();
    if (this.cartItems.length === 0) {
      this.router.navigate(['/', this.activeLang()]);
    }
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
        variantAppId: item.variantAppId,
        amount: item.amount,
        quantity: item.quantity
      })),
      comment: formValue.comment || '',
      language: this.translocoService.getActiveLang(),
      payment: this.selectedPayment
    };

    this.orderError.set(null);
    this.tracker.checkoutSubmit({phone: formValue.phone, firstName: formValue.name, lastName: formValue.lastname, amount: purchase.order.totalAmountOrder, paymentMethod: purchase.payment});

    this.purchaseService.placeOrder(purchase)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.ok === false) {
            this.tracker.checkoutFail({statusText: 'ok=false'});
            this.isSubmitting.set(false);
            this.orderError.set('errors.serverError');
            this.cdr.markForCheck();
            return;
          }
          this.tracker.checkoutSuccess(response.orderTrackingNumber);

          if (response.waitingForPayment && response.paymentUrl) {
            // Online payment: the cart stays until the order is known to be paid (order-success /
            // reconcile), so a failed or abandoned MAIB payment does not lose it.
            // isSubmitting stays true until the page leaves — a second click must not create a second order.
            if (response.orderTrackingNumber) this.pendingPayment.mark(response.orderTrackingNumber);
            if (isPlatformBrowser(this.platformId)) {
              this.redirectTo(response.paymentUrl);
            }
          } else {
            this.isSubmitting.set(false);
            this.cartService.clearCart();
            this.router.navigate(['/', this.activeLang(), 'order-success', response.orderTrackingNumber]);
          }
        },
        error: (error) => {
          console.error('Order placement failed:', error);
          this.isSubmitting.set(false);
          this.reportOrderError(error, purchase);
          this.tracker.checkoutFail(error);

          const errorMessage = error.error?.message || '';

          if (error.status === 409 && error.error?.error === 'OUT_OF_STOCK') {
            const details = error.error?.details;
            if (details?.length) {
              const names = details.map((d: any) => d.productName).join(', ');
              this.orderError.set(this.translocoService.translate('checkout.outOfStock', { products: names }));
            } else {
              this.orderError.set('checkout.outOfStockGeneric');
            }
            this.validateCart();
          } else if (error.status === 409 && error.error?.error === 'PRODUCT_UNAVAILABLE') {
            const details: UnavailableProduct[] = error.error?.details ?? [];
            this.unavailable.set(details);
            const names = details.map(d => d.productName).filter(Boolean).join(', ');
            this.orderError.set(this.translocoService.translate('checkout.productUnavailable', { name: names }));
          } else if (errorMessage.includes('Product with id')) {
            this.orderError.set('checkout.productNotFoundInCart');
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

  /**
   * Back button from MAIB may restore this page from the bfcache with isSubmitting still true —
   * unlock the button and re-check the pending payment.
   */
  @HostListener('window:pageshow', ['$event'])
  onPageShow(event: PageTransitionEvent): void {
    if (!event.persisted || !this.isSubmitting()) return;
    this.isSubmitting.set(false);
    this.cdr.markForCheck();
    this.reconcilePendingPayment();
  }

  /** Separate method so tests can stub the full-page redirect. */
  redirectTo(url: string): void {
    window.location.href = url;
  }

  private reportOrderError(error: OrderCreateFailure['error'], purchase: Purchase): void {
    this.siteEvents.reportOrderCreateFailure({
      error,
      customerName: `${purchase.customer.firstName ?? ''} ${purchase.customer.lastName ?? ''}`,
      customerPhone: purchase.customer.phone,
      paymentMethod: purchase.payment,
      amount: purchase.order.totalAmountOrder,
      language: purchase.language,
      cartItems: this.cartItems,
    });
  }

  get grandTotal(): number {
    return this.totalAmount + this.shippingCost;
  }

  dismissError(): void {
    this.orderError.set(null);
    this.unavailable.set([]);
  }

  retryLoadShipping(): void {
    this.shippingError.set(null);
    this.loadShippingOptions();
  }

  private trackBeginCheckout() {
    this.ga.trackBeginCheckout(this.cartItems, this.totalAmount);
  }
}
