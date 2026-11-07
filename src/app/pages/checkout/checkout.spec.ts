import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChangeDetectorRef, PLATFORM_ID, signal} from '@angular/core';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {provideTransloco} from '@ngneat/transloco';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {MessageService} from 'primeng/api';
import {Checkout} from './checkout';
import {CartUi} from '../../shared/components/cart/services/cart';
import {CartItem} from '../../entities/cart-item';
import {Product} from '../../entities/product';
import {Size} from '../../entities/size';
import {Language} from '../../@core/services/language';
import {Shipping} from '../../@core/api/shipping';
import {PurchaseService} from '../../@core/api/purchase';
import {ProductService} from '../../@core/api/product';
import {GoogleAnalytics} from '../../@core/services/google-analytics';
import {PendingPayment} from '../../shared/components/cart/services/pending-payment';
import {SiteEvents} from '../../@core/api/site-events';
import {ShippingOption} from '../../entities/shipping-options';
import {TranslocateHttpLoader} from '../../@core/configs/transloco-config';
import {CartPromo, CartPromoView} from '../../shared/components/cart/services/cart-promo';

const noop = (): void => undefined;
const pendingPaymentStub = () => ({mark: noop, reconcile: () => of('none')});
/** SR-229: no server calculation — checkout works on the client totals as before. */
const cartPromoStub = (view: CartPromoView | null = null) => {
  const state = signal<CartPromoView | null>(view);
  return {view: state.asReadonly(), line: (i: number) => state()?.lines[i] ?? null, state};
};

describe('Checkout order summary', () => {
  let fixture: ComponentFixture<Checkout>;
  let items$: BehaviorSubject<CartItem[]>;
  const el = () => fixture.nativeElement as HTMLElement;

  const makeItem = (n: number, sizeType?: string) =>
    new CartItem(
      {id: `p${n}`, name: `Robe ${n}`, price: 10, imageURL: `img/${n}.jpg`} as Product,
      1,
      sizeType ? new Size(sizeType) : undefined
    );
  const makeItems = (count: number) => Array.from({length: count}, (_, i) => makeItem(i + 1));

  async function setup(initial: CartItem[]) {
    items$ = new BehaviorSubject<CartItem[]>(initial);
    const cart = {
      cartItems: items$,
      totalAmount: new BehaviorSubject<number>(0),
      totalQuantity: new BehaviorSubject<number>(0),
      cartModified: new BehaviorSubject<boolean>(false),
      loadCartItemsFromStorage: () => items$.value,
      computeCartTotals: noop,
      deleteItemFromCart: noop,
      getMaxStock: () => 10,
      recalculateCartItem: noop,
    };
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        MessageService,
        {provide: CartUi, useValue: cart},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: pendingPaymentStub()},
        {provide: CartPromo, useValue: cartPromoStub()},
        {provide: SiteEvents, useValue: {reportOrderCreateFailure: noop}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Checkout);
    fixture.detectChanges();
  }

  it('photo and name link to the product in a new tab', async () => {
    await setup(makeItems(2));
    const rows = el().querySelectorAll('.cart-item');
    expect(rows.length).toBe(2);
    rows.forEach((row, i) => {
      const links = row.querySelectorAll<HTMLAnchorElement>('a');
      expect(links.length).toBe(2);
      links.forEach(a => {
        expect(a.getAttribute('href')).toContain(`/ru/product/p${i + 1}/robe-${i + 1}`);
        expect(a.target).toBe('_blank');
        expect(a.rel).toContain('noopener');
      });
      expect(row.querySelector('.item-quantity-badge')!.closest('a')).toBeNull();
    });
  });

  it('falls back to no-image.png when the image fails to load', async () => {
    await setup(makeItems(1));
    const img = el().querySelector('.cart-item img') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('img/1.jpg');
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe('assets/images/no-image.png');
    img.dispatchEvent(new Event('error'));
    expect(img.getAttribute('src')).toBe('assets/images/no-image.png');
  });

  it('uses no-image.png when imageURL is missing', async () => {
    const item = makeItem(1);
    item.product.imageURL = null;
    await setup([item]);
    expect(el().querySelector('.cart-item img')!.getAttribute('src')).toBe('assets/images/no-image.png');
  });

  it('shows size only for items with a size type', async () => {
    await setup([makeItem(1, 'M'), makeItem(2)]);
    const rows = el().querySelectorAll('.cart-item');
    expect(rows[0].querySelector('.item-size')!.textContent).toContain('M');
    expect(rows[1].querySelector('.item-size')).toBeNull();
  });

  it('scrolling modifier only above 8 items', async () => {
    await setup(makeItems(3));
    expect(el().querySelector('.cart-items')!.classList).not.toContain('cart-items--many');
    items$.next(makeItems(8));
    fixture.detectChanges();
    expect(el().querySelector('.cart-items')!.classList).not.toContain('cart-items--many');
    items$.next(makeItems(9));
    fixture.detectChanges();
    expect(el().querySelector('.cart-items')!.classList).toContain('cart-items--many');
  });

  it('summary is static with more than 3 items, sticky otherwise', async () => {
    await setup(makeItems(3));
    expect(el().querySelector('.order-summary')!.classList).not.toContain('order-summary--static');
    items$.next(makeItems(4));
    fixture.detectChanges();
    expect(el().querySelector('.order-summary')!.classList).toContain('order-summary--static');
  });
});

describe('Checkout empty cart / SSR', () => {
  async function setup(platformId: 'browser' | 'server') {
    const cart = {
      cartItems: new BehaviorSubject<CartItem[]>([]),
      totalAmount: new BehaviorSubject<number>(0),
      totalQuantity: new BehaviorSubject<number>(0),
      cartModified: new BehaviorSubject<boolean>(false),
      loadCartItemsFromStorage: () => [] as CartItem[],
      computeCartTotals: noop,
      deleteItemFromCart: noop,
      getMaxStock: () => 10,
      recalculateCartItem: noop,
    };
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        MessageService,
        {provide: PLATFORM_ID, useValue: platformId},
        {provide: CartUi, useValue: cart},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: pendingPaymentStub()},
        {provide: CartPromo, useValue: cartPromoStub()},
        {provide: SiteEvents, useValue: {reportOrderCreateFailure: noop}},
      ],
    }).compileComponents();
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    TestBed.createComponent(Checkout).detectChanges();
    return navigate;
  }

  it('browser with an empty cart redirects to the home page', async () => {
    const navigate = await setup('browser');
    expect(navigate).toHaveBeenCalledWith(['/', 'ru']);
  });

  it('server render with an empty cart does not redirect', async () => {
    const navigate = await setup('server');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('sets the checkout page title', async () => {
    await setup('server');
    expect(TestBed.inject(Title).getTitle()).toBe('Оформление заказа | Secret Room');
  });
});

describe('Checkout PRODUCT_UNAVAILABLE', () => {
  let fixture: ComponentFixture<Checkout>;
  let comp: Checkout;
  let items$: BehaviorSubject<CartItem[]>;
  let placeOrder: jasmine.Spy;
  const el = () => fixture.nativeElement as HTMLElement;

  const item = (id: string, variantAppId?: number) =>
    new CartItem({id, name: `P ${id}`, price: 10} as Product, 1, undefined, variantAppId);
  const conflict = (details: object[]) => ({
    status: 409,
    error: {error: 'PRODUCT_UNAVAILABLE', message: 'Product no longer available: x', details}
  });

  async function setup(initial: CartItem[], details: object[]) {
    items$ = new BehaviorSubject<CartItem[]>(initial);
    placeOrder = jasmine.createSpy('placeOrder').and.returnValue(throwError(() => conflict(details)));
    const cart = {
      cartItems: items$,
      totalAmount: new BehaviorSubject<number>(0),
      totalQuantity: new BehaviorSubject<number>(0),
      cartModified: new BehaviorSubject<boolean>(false),
      loadCartItemsFromStorage: () => items$.value,
      computeCartTotals: noop,
      deleteItemFromCart: (i: number) => items$.next(items$.value.filter((_, idx) => idx !== i)),
      getMaxStock: () => 10,
      recalculateCartItem: noop,
    };
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        MessageService,
        {provide: CartUi, useValue: cart},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {placeOrder}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: pendingPaymentStub()},
        {provide: CartPromo, useValue: cartPromoStub()},
        {provide: SiteEvents, useValue: {reportOrderCreateFailure: noop}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Checkout);
    comp = fixture.componentInstance;
    fixture.detectChanges();
    spyOn(comp, 'canSubmit').and.callThrough();
    comp.form.patchValue({
      email: 'a@b.md', name: 'Ion', lastname: 'Pop', address: 'Str 1', city: 'Chisinau', zip: '2001',
      phone: '069123456', selectedShipping: 1, payment: 'CashOnDelivery', iAgree: true
    });
  }

  it('parses the error, marks matching items and blocks submit', async () => {
    await setup([item('100', 200), item('100', 201), item('5')],
      [{productId: 100, appId: 100, variantAppId: 200, productName: 'Produs 100'}]);
    expect(comp.canSubmit()).toBeTrue();
    comp.onSubmit();
    expect(placeOrder).toHaveBeenCalledTimes(1);
    expect(comp.unavailable().length).toBe(1);
    expect(comp.orderError()).toContain('checkout.productUnavailable');
    expect(comp.isUnavailable(items$.value[0])).toBeTrue();
    expect(comp.isUnavailable(items$.value[1])).toBeFalse();
    expect(comp.isUnavailable(items$.value[2])).toBeFalse();
    expect(comp.canSubmit()).toBeFalse();
    comp.onSubmit();
    expect(placeOrder).toHaveBeenCalledTimes(1);
    fixture.detectChanges();
    expect(el().querySelectorAll('.cart-item--unavailable').length).toBe(1);
  });

  it('sends country as the canonical "Moldova, Republic of" and shows it localized', async () => {
    await setup([item('5')], []);
    comp.onSubmit();
    expect(placeOrder.calls.mostRecent().args[0].shippingAddress.country).toBe('Moldova, Republic of');
    const input = el().querySelector<HTMLInputElement>('#country')!;
    // no translations loaded in this spec, so transloco returns the key as is
    expect(input.value).toBe('Moldova, Republic of');
    expect(input.readOnly).toBeTrue();
    expect(comp.form.get('country')!.disabled).toBeTrue();
  });

  it('null variantAppId matches every variant of the master product', async () => {
    await setup([item('100', 200), item('100', 201), item('5')],
      [{appId: 100, variantAppId: null, productName: 'Produs 100'}]);
    comp.onSubmit();
    expect(items$.value.filter(i => comp.isUnavailable(i)).length).toBe(2);
  });

  it('removeUnavailableItems drops only the flagged items and unblocks submit', async () => {
    await setup([item('100', 200), item('100', 201), item('5')],
      [{appId: 100, variantAppId: 200, productName: 'Produs 100'}]);
    comp.onSubmit();
    comp.removeUnavailableItems();
    expect(items$.value.map(i => `${i.product.id}:${i.variantAppId ?? ''}`)).toEqual(['100:201', '5:']);
    expect(comp.unavailable()).toEqual([]);
    expect(comp.orderError()).toBeNull();
    expect(comp.canSubmit()).toBeTrue();
  });

  it('dismissing the banner clears the flags and unblocks submit', async () => {
    await setup([item('100', 200)], [{appId: 100, variantAppId: 200, productName: 'Produs 100'}]);
    comp.onSubmit();
    expect(comp.canSubmit()).toBeFalse();
    comp.dismissError();
    expect(comp.unavailable()).toEqual([]);
    expect(comp.canSubmit()).toBeTrue();
  });
});

describe('Checkout submit — online payment and error reports (SR-206)', () => {
  let comp: Checkout;
  let placeOrder: jasmine.Spy;
  let clearCart: jasmine.Spy;
  let mark: jasmine.Spy;
  let navigate: jasmine.Spy;
  let redirect: jasmine.Spy;
  let http: HttpTestingController;

  const item = (id: string) => new CartItem({id, name: `P ${id}`, price: 10} as Product, 2, new Size('M'), 7);

  async function setup(payment: 'OnlinePayment' | 'CashOnDelivery', result: () => unknown) {
    const items$ = new BehaviorSubject<CartItem[]>([item('42')]);
    placeOrder = jasmine.createSpy('placeOrder').and.callFake(result);
    clearCart = jasmine.createSpy('clearCart');
    mark = jasmine.createSpy('mark');
    const cart = {
      cartItems: items$,
      totalAmount: new BehaviorSubject<number>(20),
      totalQuantity: new BehaviorSubject<number>(2),
      cartModified: new BehaviorSubject<boolean>(false),
      loadCartItemsFromStorage: () => items$.value,
      computeCartTotals: noop,
      deleteItemFromCart: noop,
      getMaxStock: () => 10,
      recalculateCartItem: noop,
      clearCart,
    };
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        MessageService,
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: CartUi, useValue: cart},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {placeOrder}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: {mark, reconcile: () => of('none')}},
        {provide: CartPromo, useValue: cartPromoStub()},
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(Checkout);
    comp = fixture.componentInstance;
    redirect = spyOn(comp, 'redirectTo');
    fixture.detectChanges();
    comp.form.patchValue({
      email: 'a@b.md', name: 'Ion', lastname: 'Pop', address: 'Str 1', city: 'Chisinau', zip: '2001',
      phone: '069123456', selectedShipping: 1, payment, iAgree: true
    });
    comp.selectedPayment = payment;
  }

  afterEach(() => http.verify());

  it('online payment keeps the cart, marks the order and stays locked until redirect', async () => {
    await setup('OnlinePayment', () => of({ok: true, waitingForPayment: true, paymentUrl: 'https://maib/pay', orderTrackingNumber: 'tn-1'}));
    comp.onSubmit();
    expect(clearCart).not.toHaveBeenCalled();
    expect(mark).toHaveBeenCalledOnceWith('tn-1');
    expect(redirect).toHaveBeenCalledOnceWith('https://maib/pay');
    expect(comp.isSubmitting()).toBeTrue();
    comp.onSubmit();
    expect(placeOrder).toHaveBeenCalledTimes(1);
  });

  it('cash on delivery clears the cart and opens order-success as before', async () => {
    await setup('CashOnDelivery', () => of({ok: true, waitingForPayment: false, orderTrackingNumber: 'tn-2'}));
    comp.onSubmit();
    expect(clearCart).toHaveBeenCalledTimes(1);
    expect(mark).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/', 'ru', 'order-success', 'tn-2']);
    expect(comp.isSubmitting()).toBeFalse();
  });

  it('network error (status 0) is reported to site-events', async () => {
    await setup('CashOnDelivery', () => throwError(() =>
      new HttpErrorResponse({status: 0, statusText: 'Unknown Error', error: new ProgressEvent('error')})));
    comp.onSubmit();
    const req = http.expectOne(r => r.url.endsWith('v1/site-events'));
    expect(req.request.method).toBe('POST');
    const body = req.request.body;
    expect(body.kind).toBe('CHECKOUT_ERROR');
    expect(body.source).toBe('FRONTEND');
    expect(body.step).toBe('ORDER_CREATE');
    expect(body.errorCode).toBe('NETWORK');
    expect(body.customerName).toBe('Ion Pop');
    expect(body.customerPhone).toBe('069123456');
    expect(body.paymentMethod).toBe('CashOnDelivery');
    expect(body.cart).toEqual([{appId: 42, variantAppId: 7, name: 'P 42', size: 'M', quantity: 2, price: 10}]);
    req.flush({});
    expect(comp.orderError()).toBe('errors.serverError');
    expect(comp.isSubmitting()).toBeFalse();
  });

  it('409 with a body is not reported — the backend logged it', async () => {
    await setup('CashOnDelivery', () => throwError(() => new HttpErrorResponse({
      status: 409, statusText: 'Conflict', error: {error: 'OUT_OF_STOCK', message: 'x', details: []}
    })));
    comp.onSubmit();
    http.expectNone(r => r.url.endsWith('v1/site-events'));
    expect().nothing();
  });
});

describe('Checkout validation messages and the hint under "Place order" (SR-206)', () => {
  let fixture: ComponentFixture<Checkout>;
  let comp: Checkout;
  let items$: BehaviorSubject<CartItem[]>;
  const el = () => fixture.nativeElement as HTMLElement;
  const render = () => {
    fixture.debugElement.injector.get(ChangeDetectorRef).markForCheck();
    fixture.detectChanges();
  };

  const VALID = {
    email: 'a@b.md', name: 'Ion', lastname: 'Pop', address: 'Str 1', city: 'Chisinau', zip: '2001',
    phone: '069123456', selectedShipping: 1, payment: 'CashOnDelivery', iAgree: true
  };

  async function setup() {
    items$ = new BehaviorSubject<CartItem[]>([new CartItem({id: '5', name: 'P 5', price: 10} as Product, 1)]);
    const cart = {
      cartItems: items$,
      totalAmount: new BehaviorSubject<number>(0),
      totalQuantity: new BehaviorSubject<number>(0),
      cartModified: new BehaviorSubject<boolean>(false),
      loadCartItemsFromStorage: () => items$.value,
      computeCartTotals: noop,
      deleteItemFromCart: noop,
      getMaxStock: () => 10,
      recalculateCartItem: noop,
    };
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        MessageService,
        {provide: CartUi, useValue: cart},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: pendingPaymentStub()},
        {provide: CartPromo, useValue: cartPromoStub()},
        {provide: SiteEvents, useValue: {reportOrderCreateFailure: noop}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Checkout);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  beforeEach(setup);

  it('Cyrillic in the first name gives the "Latin letters only" message, shown under the field', () => {
    comp.form.patchValue({name: 'Мария'});
    expect(comp.fieldError('name')!.key).toBe('checkout.validation.name.pattern');
    expect(comp.fieldError('name')!.shortKey).toBe('checkout.submitHint.name.pattern');

    comp.form.get('name')!.markAsTouched();
    render();
    // no translations loaded in this spec, so transloco renders the key
    expect(el().querySelector('#name-error')!.textContent!.trim()).toBe('checkout.validation.name.pattern');
    expect(el().querySelector('#name')!.getAttribute('aria-describedby')).toBe('name-error');
  });

  it('Romanian diacritics and a single Cyrillic letter are reported as "Latin letters only" too', () => {
    comp.form.patchValue({lastname: 'Roșca'});
    expect(comp.fieldError('lastname')!.key).toBe('checkout.validation.lastname.pattern');
    comp.form.patchValue({lastname: 'И'});
    expect(comp.fieldError('lastname')!.key).toBe('checkout.validation.lastname.pattern');
  });

  it('too short Latin name reports minlength with the required length', () => {
    comp.form.patchValue({name: 'A'});
    expect(comp.fieldError('name')).toEqual(jasmine.objectContaining({
      key: 'checkout.validation.name.minlength', params: {min: 2}
    }));
  });

  it('wrong phone formats give the phone pattern message, an empty one the required message', () => {
    for (const phone of ['+37369123456', '69123456', '069 123 456', '0791234567', '022123456']) {
      comp.form.patchValue({phone});
      expect(comp.fieldError('phone')?.key).withContext(phone).toBe('checkout.validation.phone.pattern');
    }
    comp.form.patchValue({phone: ''});
    expect(comp.fieldError('phone')!.key).toBe('checkout.validation.phone.required');
    comp.form.patchValue({phone: '079123456'});
    expect(comp.fieldError('phone')).toBeNull();
  });

  it('every field and rule maps to its own key', () => {
    comp.form.patchValue({email: 'ivan@mail', zip: 'MD-2001', address: 'ab', city: 'C', iAgree: false});
    expect(comp.fieldError('email')!.key).toBe('checkout.validation.email.pattern');
    expect(comp.fieldError('zip')!.key).toBe('checkout.validation.zip.pattern');
    expect(comp.fieldError('address')!.key).toBe('checkout.validation.address.minlength');
    expect(comp.fieldError('city')!.key).toBe('checkout.validation.city.minlength');
    expect(comp.fieldError('iAgree')!.key).toBe('checkout.validation.iAgree.required');
    expect(comp.fieldError('selectedShipping')!.key).toBe('checkout.validation.selectedShipping.required');
    expect(comp.fieldError('payment')!.key).toBe('checkout.validation.payment.required');
  });

  it('the hint under the button lists exactly the invalid fields, in screen order', () => {
    comp.form.patchValue({...VALID, name: 'Мария', phone: '+37369123456', iAgree: false});
    expect(comp.canSubmit()).toBeFalse();
    expect(comp.blockingFields().map(e => e.field)).toEqual(['phone', 'name', 'iAgree']);

    // untouched form: no wall of errors yet
    expect(comp.submitHint()).toBeNull();

    comp.form.get('iAgree')!.markAsTouched();
    const hint = comp.submitHint()!;
    expect(hint.kind).toBe('fields');
    expect(hint.kind === 'fields' && hint.errors.map(e => e.shortKey)).toEqual([
      'checkout.submitHint.phone.pattern', 'checkout.submitHint.name.pattern', 'checkout.submitHint.iAgree.required'
    ]);

    comp.step = 'payment';
    render();
    const items = el().querySelectorAll<HTMLButtonElement>('.submit-hint-item');
    expect(items.length).toBe(3);
    expect(items[0].textContent).toContain('checkout.fields.phone');
    expect(items[0].textContent).toContain('checkout.submitHint.phone.pattern');
  });

  it('clicking a field in the hint opens its step and marks the form touched', () => {
    comp.form.patchValue({...VALID, name: 'Мария'});
    comp.form.get('payment')!.markAsDirty();
    comp.step = 'payment';
    render();
    expect(comp.form.get('name')!.touched).toBeFalse();

    el().querySelector<HTMLButtonElement>('.submit-hint-item')!.click();
    fixture.detectChanges();
    expect(comp.step).toBe('information');
    expect(comp.form.get('name')!.touched).toBeTrue();
    expect(el().querySelector('#name-error')!.textContent!.trim()).toBe('checkout.validation.name.pattern');
  });

  it('"Continue to payment" lists only the shipping step fields and the click focuses them', () => {
    // info fields are fine, an invalid name would block only the final submit
    comp.form.patchValue({...VALID, name: 'Мария', selectedShipping: '', payment: '', iAgree: false});
    comp.step = 'shipping';
    expect(comp.continueHint()).toBeNull(); // untouched form

    comp.form.get('email')!.markAsDirty();
    const hint = comp.continueHint()!;
    expect(hint).toEqual(jasmine.objectContaining({kind: 'fields', titleKey: 'checkout.submitHint.continueTitle'}));
    expect(hint.kind === 'fields' && hint.errors.map(e => e.field)).toEqual(['selectedShipping']);
    expect(comp.blockingFields('shipping').map(e => e.field)).toEqual(['selectedShipping']);

    render();
    const items = el().querySelectorAll<HTMLButtonElement>('.submit-hint-item');
    expect(items.length).toBe(1);
    expect(items[0].textContent).toContain('checkout.submitHint.selectedShipping.required');
    items[0].click();
    fixture.detectChanges();
    expect(comp.step).toBe('shipping');
    expect(comp.form.get('selectedShipping')!.touched).toBeTrue();

    comp.selectShippingOption({id: '1', freeShippingFrom: 0, cost: 0} as unknown as ShippingOption);
    expect(comp.continueHint()).toBeNull();
  });

  it('valid form: no hint; unavailable items or submitting: no field list', () => {
    comp.form.patchValue(VALID);
    comp.form.markAllAsTouched();
    expect(comp.submitHint()).toBeNull();

    comp.unavailable.set([{appId: '5', variantAppId: null, productName: 'P 5'}]);
    expect(comp.submitHint()).toEqual({kind: 'message', key: 'checkout.submitHint.unavailable'});
    // the order error banner already explains it
    comp.orderError.set('checkout.productUnavailable');
    expect(comp.submitHint()).toBeNull();

    comp.unavailable.set([]);
    comp.orderError.set(null);
    comp.form.patchValue({phone: ''});
    comp.isSubmitting.set(true);
    expect(comp.submitHint()).toBeNull();
  });
});

describe('Checkout promotions (SR-229)', () => {
  let fixture: ComponentFixture<Checkout>;
  let comp: Checkout;
  let promo: ReturnType<typeof cartPromoStub>;
  let placeOrder: jasmine.Spy;
  const el = () => fixture.nativeElement as HTMLElement;

  const promoView = (): CartPromoView => ({
    lines: [
      {productId: 12, variantAppId: null, quantity: 2, unitPrice: 100, price: 100, lineTotal: 150, promotionSavings: 50,
        promotion: {id: 7, type: 'NTH_PERCENT', percent: 50, nth: 2, buy: null, free: null, onlineOnly: true}, available: true},
      {productId: 13, variantAppId: null, quantity: 1, unitPrice: 80, price: 80, lineTotal: 80, promotionSavings: 0,
        promotion: null, available: true},
    ],
    itemsTotal: 280, promotionSavings: 50, total: 230,
  });

  const defaultItems = () => [
    new CartItem({id: '12', name: 'Robe', price: 100} as Product, 2),
    new CartItem({id: '13', name: 'Slip', price: 80} as Product, 1),
  ];

  async function setup(view: CartPromoView | null, items = defaultItems()) {
    const items$ = new BehaviorSubject<CartItem[]>(items);
    promo = cartPromoStub(view);
    placeOrder = jasmine.createSpy('placeOrder').and.returnValue(of({ok: true, orderTrackingNumber: 'tn'}));
    await TestBed.configureTestingModule({
      imports: [Checkout],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}, loader: TranslocateHttpLoader}),
        MessageService,
        {provide: CartUi, useValue: {
          cartItems: items$,
          totalAmount: new BehaviorSubject<number>(280),
          totalQuantity: new BehaviorSubject<number>(3),
          cartModified: new BehaviorSubject<boolean>(false),
          loadCartItemsFromStorage: () => items$.value,
          computeCartTotals: noop,
          deleteItemFromCart: noop,
          getMaxStock: () => 10,
          recalculateCartItem: noop,
          clearCart: noop,
        }},
        {provide: Language, useValue: {currentLanguage: signal('ru'), setLanguage: noop}},
        {provide: Shipping, useValue: {getShippingOptions: () => of([])}},
        {provide: PurchaseService, useValue: {placeOrder}},
        {provide: ProductService, useValue: {getProductById: (id: string) => of({id} as Product)}},
        {provide: GoogleAnalytics, useValue: {send: noop, trackBeginCheckout: noop}},
        {provide: PendingPayment, useValue: pendingPaymentStub()},
        {provide: CartPromo, useValue: promo},
        {provide: SiteEvents, useValue: {reportOrderCreateFailure: noop}},
      ],
    }).compileComponents();
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(Checkout);
    comp = fixture.componentInstance;
    fixture.detectChanges();
  }

  const totals = () => Array.from(el().querySelectorAll('.summary-totals .total-row'))
    .map(r => Array.from(r.children).map(c => c.textContent!.trim()).join(' '));

  const shipping = (freeShippingFrom: number) =>
    ({id: '1', cost: 50, freeShippingFrom, cashOnDeliveryAvailable: true} as unknown as ShippingOption);

  it('server result: subtotal, discount row, total = total + delivery; line label and «online only»', async () => {
    await setup(promoView());
    comp.selectShippingOption(shipping(1000));
    fixture.detectChanges();
    expect(totals()).toEqual(['В корзине 280 MDL', 'Скидка по акции −50 MDL', 'Доставка 50 MDL', 'Всего к оплате 280 MDL']);
    const [promoItem, plainItem] = Array.from(el().querySelectorAll('.cart-item'));
    expect(promoItem.querySelector('.item-promo-price .price')!.textContent).toContain('150 MDL');
    expect(promoItem.querySelector('.item-promo-price .old-price')!.textContent).toContain('200 MDL');
    expect(promoItem.querySelector('.item-promo-label')!.textContent!.trim()).toBe('2-й товар −50%');
    expect(promoItem.querySelector('.item-promo-online')!.textContent!.trim()).toBe('только онлайн');
    expect(plainItem.querySelector('.item-promo-price')).toBeNull();
  });

  it('no server result: no discount row, client totals as before', async () => {
    await setup(null);
    comp.selectShippingOption(shipping(1000));
    fixture.detectChanges();
    expect(totals()).toEqual(['В корзине 280 MDL', 'Доставка 50 MDL', 'Всего к оплате 330 MDL']);
    expect(el().querySelector('.item-promo-price')).toBeNull();
  });

  it('«не навреди»: server result without promotions, qty 2 at 100 — the line shows 100 MDL, not 200', async () => {
    await setup({...promoView(), lines: promoView().lines.map(l => ({...l, promotionSavings: 0, lineTotal: l.price * l.quantity,
      promotion: null})), promotionSavings: 0, total: 280});
    comp.selectShippingOption(shipping(1000));
    fixture.detectChanges();
    const [robe] = Array.from(el().querySelectorAll('.cart-item'));
    expect(robe.querySelector('product-price .price')!.textContent!.trim()).toBe('100 MDL');
    expect(robe.querySelector('.old-price')).toBeNull();
    expect(totals()).toEqual(['В корзине 280 MDL', 'Доставка 50 MDL', 'Всего к оплате 330 MDL']);
  });

  it('server result without promotions: the server unit price, not the stale catalog PERCENT price', async () => {
    await setup({
      lines: [{productId: 21, variantAppId: null, quantity: 2, unitPrice: 320, price: 320, lineTotal: 640, promotionSavings: 0,
        promotion: null, available: true}],
      itemsTotal: 640, promotionSavings: 0, total: 640,
    }, [new CartItem({id: '21', name: 'A', price: 256, oldPrice: 320} as Product, 2)]);
    fixture.detectChanges();
    const a = el().querySelector('.cart-item')!;
    expect(a.querySelector('product-price .price')!.textContent!.trim()).toBe('320 MDL');
    expect(a.querySelector('.old-price')).toBeNull();
  });

  it('the server total wins over the client one and moves the free shipping threshold', async () => {
    await setup(null);
    comp.selectShippingOption(shipping(250));
    fixture.detectChanges();
    expect(comp.shippingCost).toBe(0);

    promo.state.set(promoView());
    fixture.detectChanges();
    expect(comp.shippingCost).toBe(50);
    expect(comp.grandTotal).toBe(280);
  });

  it('the order carries the shown totals; items and form stay as before', async () => {
    await setup(promoView());
    comp.form.patchValue({
      email: 'a@b.md', name: 'Ion', lastname: 'Pop', address: 'Str 1', city: 'Chisinau', zip: '2001',
      phone: '069123456', payment: 'CashOnDelivery', iAgree: true
    });
    comp.selectShippingOption(shipping(1000));
    comp.form.patchValue({payment: 'CashOnDelivery'});
    comp.selectedPayment = 'CashOnDelivery' as never;
    comp.onSubmit();
    const purchase = placeOrder.calls.mostRecent().args[0];
    expect(purchase.order.totalAmount).toBe(230);
    expect(purchase.order.totalAmountOrder).toBe(280);
    expect(purchase.orderItems.map((i: {amount: number}) => i.amount)).toEqual([200, 80]);
  });

  it('QA: every line comes from the server, not from the catalog PERCENT price saved in the cart', async () => {
    // A: −20% PERCENT in the catalog (320 → 256), but "2nd −50%" won and took both lines: A pays 320, B 160.
    await setup({
      lines: [
        {productId: 21, variantAppId: null, quantity: 1, unitPrice: 320, price: 320, lineTotal: 320, promotionSavings: 0,
          promotion: null, available: true},
        {productId: 22, variantAppId: null, quantity: 1, unitPrice: 320, price: 320, lineTotal: 160, promotionSavings: 160,
          promotion: {id: 9, type: 'NTH_PERCENT', percent: 50, nth: 2, onlineOnly: false}, available: true},
      ],
      itemsTotal: 640, promotionSavings: 160, total: 480,
    }, [
      new CartItem({id: '21', name: 'A', price: 256, oldPrice: 320} as Product, 1),
      new CartItem({id: '22', name: 'B', price: 320} as Product, 1),
    ]);
    comp.selectShippingOption(shipping(1000));
    fixture.detectChanges();
    const [a, b] = Array.from(el().querySelectorAll('.cart-item'));
    expect(a.querySelector('product-price .price')!.textContent).toContain('320 MDL');
    expect(a.querySelector('.old-price')).toBeNull();
    expect(a.querySelector('.item-promo-label')).toBeNull();
    expect(b.querySelector('.item-promo-price .price')!.textContent).toContain('160 MDL');
    expect(b.querySelector('.item-promo-price .old-price')!.textContent).toContain('320 MDL');
    const sum = Array.from(el().querySelectorAll('.cart-item product-price .price'))
      .reduce((acc, p) => acc + parseFloat(p.textContent!), 0);
    expect(sum).toBe(480);
    expect(totals()).toEqual(['В корзине 640 MDL', 'Скидка по акции −160 MDL', 'Доставка 50 MDL', 'Всего к оплате 530 MDL']);
  });
});
