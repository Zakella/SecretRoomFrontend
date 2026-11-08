import {ChangeDetectorRef, PLATFORM_ID, signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideRouter, Router} from '@angular/router';
import {BehaviorSubject, of, Subject} from 'rxjs';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../@core/configs/transloco-config';
import {CartItem} from '../../../entities/cart-item';
import {ShippingOption} from '../../../entities/shipping-options';
import {Product} from '../../../entities/product';
import {Language} from '../../../@core/services/language';
import {Shipping} from '../../../@core/api/shipping';
import {RecommendedProductService} from '../product/recommended-products/recommended-product-service';
import {Cart} from './cart';
import {CartUi} from './services/cart';
import {QuickAddToCart} from './services/quick-add-to-cart';
import {PendingPayment} from './services/pending-payment';
import {CartPromo, CartPromoView} from './services/cart-promo';

describe('Cart', () => {
  it('delegates recommendation add to QuickAddToCart', () => {
    const add = jasmine.createSpy('add');
    TestBed.configureTestingModule({
      providers: [
        {provide: QuickAddToCart, useValue: {add}},
        {provide: CartUi, useValue: {}},
        {provide: Shipping, useValue: {}},
        {provide: RecommendedProductService, useValue: {}},
        {provide: ChangeDetectorRef, useValue: {markForCheck: () => undefined}},
        {provide: Router, useValue: {}},
        {provide: Language, useValue: {currentLanguage: () => 'ro'}},
        {provide: PendingPayment, useValue: {}},
        {provide: CartPromo, useValue: {}},
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Cart());
    const p = {id: '1'} as Product;
    (component as unknown as {addRecommendationToCart(p: Product): void}).addRecommendationToCart(p);
    expect(add).toHaveBeenCalledOnceWith(p);
  });
});

describe('Cart drawer promotions (SR-229)', () => {
  const view = (): CartPromoView => ({
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

  function render(promoView: CartPromoView | null, freeShippingFrom = 0, items = defaultItems()) {
    const state = signal<CartPromoView | null>(promoView);
    TestBed.configureTestingModule({
      imports: [Cart],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}, loader: TranslocateHttpLoader}),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: CartUi, useValue: {
          cartItems: new BehaviorSubject(items),
          totalAmount: new BehaviorSubject(280),
          totalQuantity: new BehaviorSubject(3),
          cartModified: new Subject<boolean>(),
          computeCartTotals: () => undefined,
          getMaxStock: () => 10,
          close: () => undefined,
        }},
        {provide: CartPromo, useValue: {view: state.asReadonly(), line: (i: number) => state()?.lines[i] ?? null}},
        {provide: QuickAddToCart, useValue: {isLoading: () => false}},
        {provide: Shipping, useValue: {getShippingOptions: () => of(freeShippingFrom ? [{freeShippingFrom} as ShippingOption] : [])}},
        {provide: RecommendedProductService, useValue: {getCartRecommendations: () => of([])}},
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: PendingPayment, useValue: {reconcile: () => of('none')}},
      ],
    });
    const fixture = TestBed.createComponent(Cart);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const rows = (el: HTMLElement) => Array.from(el.querySelectorAll('.cart-footer .subtotal'))
    .map(r => Array.from(r.children).map(c => c.textContent!.trim()).join(' '));

  it('server result with a promotion: discount row, total = total, line label and «online only»', () => {
    const el = render(view());
    expect(rows(el)).toEqual(['В корзине 280 MDL', 'Скидка по акции −50 MDL', 'Всего к оплате 230 MDL']);
    const [promoItem, plainItem] = Array.from(el.querySelectorAll('.cart-item'));
    expect(promoItem.querySelector('.item-promo-price .price')!.textContent).toContain('150 MDL');
    expect(promoItem.querySelector('.item-promo-price .old-price')!.textContent).toContain('200 MDL');
    expect(promoItem.querySelector('.item-promo-label')!.textContent!.trim()).toBe('2-й товар −50%');
    expect(promoItem.querySelector('.item-promo-online')!.textContent!.trim()).toBe('только онлайн');
    expect(plainItem.querySelector('.item-promo-price')).toBeNull();
    expect(plainItem.querySelector('product-price .price')!.textContent).toContain('80 MDL');
  });

  it('no server result (error, old webstore): no discount row, client totals as before', () => {
    const el = render(null);
    expect(rows(el)).toEqual(['В корзине 280 MDL', 'Всего к оплате 280 MDL']);
    expect(el.querySelector('.item-promo-price')).toBeNull();
    expect(el.querySelector('.item-promo-label')).toBeNull();
  });

  it('server result without promotions: no discount row', () => {
    const el = render({...view(), lines: view().lines.map(l => ({...l, promotionSavings: 0, lineTotal: l.price * l.quantity, promotion: null})),
      promotionSavings: 0, total: 280});
    expect(rows(el)).toEqual(['В корзине 280 MDL', 'Всего к оплате 280 MDL']);
    expect(el.querySelector('.item-promo-price')).toBeNull();
  });

  it('«не навреди»: server result without promotions, qty 2 at 100 — the line shows 100 MDL, not 200', () => {
    const el = render({...view(), lines: view().lines.map(l => ({...l, promotionSavings: 0, lineTotal: l.price * l.quantity, promotion: null})),
      promotionSavings: 0, total: 280});
    const [robe] = Array.from(el.querySelectorAll('.cart-item'));
    expect(robe.querySelector('product-price .price')!.textContent!.trim()).toBe('100 MDL');
    expect(robe.querySelector('.old-price')).toBeNull();
  });

  it('server result without promotions: the server unit price, not the stale catalog PERCENT price', () => {
    const items = [new CartItem({id: '21', name: 'A', price: 256, oldPrice: 320} as Product, 2)];
    const el = render({
      lines: [{productId: 21, variantAppId: null, quantity: 2, unitPrice: 320, price: 320, lineTotal: 640, promotionSavings: 0,
        promotion: null, available: true}],
      itemsTotal: 640, promotionSavings: 0, total: 640,
    }, 0, items);
    const a = el.querySelector('.cart-item')!;
    expect(a.querySelector('product-price .price')!.textContent!.trim()).toBe('320 MDL');
    expect(a.querySelector('.old-price')).toBeNull();
  });

  it('server result without promotions, product discount: unit price and the base unit price crossed out', () => {
    const el = render({
      lines: [{productId: 12, variantAppId: null, quantity: 2, unitPrice: 400, price: 320, lineTotal: 640, promotionSavings: 0,
        promotion: null, available: true}],
      itemsTotal: 640, promotionSavings: 0, total: 640,
    }, 0, [new CartItem({id: '12', name: 'Robe', price: 320, oldPrice: 400} as Product, 2)]);
    const robe = el.querySelector('.cart-item')!;
    expect(robe.querySelector('.price')!.textContent!.trim()).toBe('320 MDL');
    expect(robe.querySelector('.old-price')!.textContent!.trim()).toBe('400 MDL');
  });

  it('free shipping bar counts the total after the promotion', () => {
    const el = render(view(), 300);
    expect(el.querySelector('.free-shipping-bar')!.textContent).toContain('70 MDL');
  });

  it('QA: every line comes from the server, not from the catalog PERCENT price saved in the cart', () => {
    // A: −20% PERCENT in the catalog (320 → 256), but "2nd −50%" won and took both lines: A pays 320, B 160.
    const items = [
      new CartItem({id: '21', name: 'A', price: 256, oldPrice: 320} as Product, 1),
      new CartItem({id: '22', name: 'B', price: 320} as Product, 1),
    ];
    const el = render({
      lines: [
        {productId: 21, variantAppId: null, quantity: 1, unitPrice: 320, price: 320, lineTotal: 320, promotionSavings: 0,
          promotion: null, available: true},
        {productId: 22, variantAppId: null, quantity: 1, unitPrice: 320, price: 320, lineTotal: 160, promotionSavings: 160,
          promotion: {id: 9, type: 'NTH_PERCENT', percent: 50, nth: 2, onlineOnly: false}, available: true},
      ],
      itemsTotal: 640, promotionSavings: 160, total: 480,
    }, 0, items);
    const [a, b] = Array.from(el.querySelectorAll('.cart-item'));
    expect(a.querySelector('product-price .price')!.textContent).toContain('320 MDL');
    expect(a.querySelector('.old-price')).toBeNull();
    expect(a.querySelector('.item-promo-label')).toBeNull();
    expect(b.querySelector('.item-promo-price .price')!.textContent).toContain('160 MDL');
    expect(b.querySelector('.item-promo-price .old-price')!.textContent).toContain('320 MDL');
    expect(b.querySelector('.item-promo-online')).toBeNull();
    const sum = Array.from(el.querySelectorAll('.cart-item product-price .price'))
      .reduce((acc, p) => acc + parseFloat(p.textContent!), 0);
    expect(sum).toBe(480);
    expect(rows(el)).toEqual(['В корзине 640 MDL', 'Скидка по акции −160 MDL', 'Всего к оплате 480 MDL']);
  });

  it('server line with a product discount and no promotion: base × qty crossed out, line total shown', () => {
    const el = render({...view(), lines: [view().lines[0],
      {productId: 13, variantAppId: null, quantity: 1, unitPrice: 100, price: 80, lineTotal: 80, promotionSavings: 0,
        promotion: null, available: true}]});
    const plainItem = el.querySelectorAll('.cart-item')[1];
    expect(plainItem.querySelector('.item-promo-price')).toBeNull();
    expect(plainItem.querySelector('.old-price')!.textContent).toContain('100 MDL');
    expect(plainItem.querySelector('.price')!.textContent).toContain('80 MDL');
  });
});
