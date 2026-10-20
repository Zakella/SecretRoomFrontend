import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {PLATFORM_ID, signal} from '@angular/core';
import {BehaviorSubject, of, throwError} from 'rxjs';
import {provideTransloco} from '@ngneat/transloco';
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

const noop = (): void => undefined;

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
