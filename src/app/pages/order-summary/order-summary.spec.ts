import {TestBed, fakeAsync, tick, discardPeriodicTasks} from '@angular/core/testing';
import {ActivatedRoute, provideRouter} from '@angular/router';
import {PLATFORM_ID, signal} from '@angular/core';
import {of} from 'rxjs';
import {provideTransloco} from '@ngneat/transloco';
import {OrderSummary} from './order-summary';
import {PurchaseService} from '../../@core/api/purchase';
import {Language} from '../../@core/services/language';
import {GoogleAnalytics} from '../../@core/services/google-analytics';
import {OrderReview} from '../../entities/order-review';
import {PendingPayment} from '../../shared/components/cart/services/pending-payment';
import {CartUi} from '../../shared/components/cart/services/cart';
import {SiteTracker} from '../../@core/api/site-tracker';
import {TranslocateHttpLoader} from '../../@core/configs/transloco-config';

describe('OrderSummary purchase tracking', () => {
  const order = (status: string) => ({orderNumber: '1', status, items: [], customer: {}, shippingAddress: {}} as unknown as OrderReview);
  let getOrder: jasmine.Spy;
  let trackPurchase: jasmine.Spy;
  let settle: jasmine.Spy;

  function create(...statuses: string[]) {
    getOrder = jasmine.createSpy('getOrderDetails');
    getOrder.and.returnValues(...statuses.map(x => of(order(x))));
    trackPurchase = jasmine.createSpy('trackPurchase');
    settle = jasmine.createSpy('settle');
    TestBed.configureTestingModule({
      imports: [OrderSummary],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'uuid-1'}}}},
        {provide: PurchaseService, useValue: {getOrderDetails: getOrder}},
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: GoogleAnalytics, useValue: {trackPurchase}},
        {provide: PendingPayment, useValue: {settle}},
      ],
    });
    const fixture = TestBed.createComponent(OrderSummary);
    fixture.detectChanges();
    return fixture;
  }

  it('re-requests PAYMENT_WAITING order and tracks once it becomes PENDING', fakeAsync(() => {
    const f = create('PAYMENT_WAITING', 'PENDING');
    expect(getOrder).toHaveBeenCalledTimes(1);
    tick(3000);
    expect(getOrder).toHaveBeenCalledTimes(2);
    expect(trackPurchase.calls.mostRecent().args[0].status).toBe('PENDING');
    tick(30000);
    expect(getOrder).toHaveBeenCalledTimes(2);
    f.destroy();
  }));

  it('does not re-request PAYMENT_FAILED', fakeAsync(() => {
    const f = create('PAYMENT_FAILED');
    tick(30000);
    expect(getOrder).toHaveBeenCalledTimes(1);
    f.destroy();
    discardPeriodicTasks();
  }));

  it('settles the pending online payment once the order is loaded (cart + marker)', fakeAsync(() => {
    const f = create('PENDING');
    expect(settle).toHaveBeenCalledOnceWith('uuid-1', 'PENDING');
    f.destroy();
  }));
});

describe('OrderSummary clears the cart after online payment (real PendingPayment)', () => {
  afterEach(() => localStorage.removeItem('pendingPayment'));

  it('clears cart and marker for the marked order', () => {
    const clearCart = jasmine.createSpy('clearCart');
    TestBed.configureTestingModule({
      imports: [OrderSummary],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'uuid-1'}}}},
        {provide: PurchaseService, useValue: {getOrderDetails: () => of({orderNumber: '1', status: 'PENDING', items: [], customer: {}, shippingAddress: {}})}},
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: GoogleAnalytics, useValue: {trackPurchase: () => undefined}},
        {provide: CartUi, useValue: {clearCart}},
      ],
    });
    TestBed.inject(PendingPayment).mark('uuid-1');
    TestBed.createComponent(OrderSummary).detectChanges();
    expect(clearCart).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('pendingPayment')).toBeNull();
  });
});

describe('OrderSummary promotions (SR-229)', () => {
  const promo = {id: 7, type: 'NTH_PERCENT', percent: 50, nth: 2, buy: null, free: null, onlineOnly: true};
  const review = (withPromo: boolean): OrderReview => ({
    orderNumber: '00012', status: 'PENDING', customer: {firstName: 'Ion', lastName: 'Pop'}, shippingAddress: {},
    shippingCost: 0, comment: '',
    items: [
      {product: {id: '12', name: 'Robe'}, quantity: 2, amount: 100,
        ...(withPromo ? {lineTotal: 150, promotionSavings: 50, promotion: promo} : {})},
      {product: {id: '13', name: 'Slip'}, quantity: 1, amount: 80,
        ...(withPromo ? {lineTotal: 80, promotionSavings: 0, promotion: null} : {})},
    ],
    subtotal: withPromo ? 230 : 280,
    totalAmountOrder: withPromo ? 230 : 280,
    ...(withPromo ? {promotionSavings: 50} : {}),
  } as unknown as OrderReview);

  function render(order: OrderReview): HTMLElement {
    TestBed.configureTestingModule({
      imports: [OrderSummary],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}, loader: TranslocateHttpLoader}),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: ActivatedRoute, useValue: {snapshot: {paramMap: {get: () => 'uuid-1'}}}},
        {provide: PurchaseService, useValue: {getOrderDetails: () => of(order)}},
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: GoogleAnalytics, useValue: {trackPurchase: () => undefined}},
        {provide: PendingPayment, useValue: {settle: () => undefined}},
        {provide: SiteTracker, useValue: {orderLink: () => undefined}},
      ],
    });
    const fixture = TestBed.createComponent(OrderSummary);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  const totals = (el: HTMLElement) => Array.from(el.querySelectorAll('.order-totals .total-row'))
    .map(r => Array.from(r.children).map(c => c.textContent!.replace(/\s+/g, ' ').trim()).join(' | '));

  it('discount row from promotionSavings, subtotal before it, label and line total on the promo line', () => {
    const el = render(review(true));
    expect(totals(el)).toEqual(['В корзине | MDL 280', 'Скидка по акции | −MDL 50', 'Доставка | Бесплатно', 'Всего к оплате | MDL 230']);
    const [promoItem, plainItem] = Array.from(el.querySelectorAll('.order-item'));
    expect(promoItem.querySelector('.item-old-price')!.textContent!.trim()).toBe('MDL 200');
    expect(promoItem.querySelector('.item-promo-price')!.textContent).toContain('MDL 150');
    expect(promoItem.querySelector('.item-promo-label')!.textContent!.trim()).toBe('2-й товар −50%');
    expect(plainItem.querySelector('.item-promo-price')).toBeNull();
    expect(plainItem.querySelector('.item-price')!.textContent!.trim()).toBe('MDL 80');
  });

  it('without promotions (old webstore or none): page as before', () => {
    const el = render(review(false));
    expect(totals(el)).toEqual(['В корзине | MDL 280', 'Доставка | Бесплатно', 'Всего к оплате | MDL 280']);
    expect(el.querySelector('.item-promo-price')).toBeNull();
    expect(Array.from(el.querySelectorAll('.order-item .item-price')).map(e => e.textContent!.trim())).toEqual(['MDL 100', 'MDL 80']);
  });
});
