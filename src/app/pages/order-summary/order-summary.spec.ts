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
