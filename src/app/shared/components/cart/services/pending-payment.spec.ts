import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {of, throwError} from 'rxjs';
import {PENDING_PAYMENT_KEY, PENDING_PAYMENT_TTL_MS, PendingPayment, PendingPaymentOutcome} from './pending-payment';
import {PurchaseService} from '../../../../@core/api/purchase';
import {CartUi} from './cart';

describe('PendingPayment', () => {
  let service: PendingPayment;
  let clearCart: jasmine.Spy;
  let getOrderDetails: jasmine.Spy;

  function setup(platform: 'browser' | 'server' = 'browser') {
    clearCart = jasmine.createSpy('clearCart');
    getOrderDetails = jasmine.createSpy('getOrderDetails');
    TestBed.configureTestingModule({
      providers: [
        {provide: PLATFORM_ID, useValue: platform},
        {provide: PurchaseService, useValue: {getOrderDetails}},
        {provide: CartUi, useValue: {clearCart}},
      ],
    });
    service = TestBed.inject(PendingPayment);
  }

  const reconcile = () => {
    let outcome: PendingPaymentOutcome | undefined;
    service.reconcile().subscribe(o => outcome = o);
    return outcome;
  };

  beforeEach(() => localStorage.removeItem(PENDING_PAYMENT_KEY));
  afterEach(() => localStorage.removeItem(PENDING_PAYMENT_KEY));

  it('without a marker does not call the backend', () => {
    setup();
    expect(reconcile()).toBe('none');
    expect(getOrderDetails).not.toHaveBeenCalled();
  });

  it('paid order clears the cart and the marker', () => {
    setup();
    service.mark('tn-1');
    getOrderDetails.and.returnValue(of({status: 'PENDING'}));
    expect(reconcile()).toBe('paid');
    expect(getOrderDetails).toHaveBeenCalledOnceWith('tn-1');
    expect(clearCart).toHaveBeenCalledTimes(1);
    expect(service.get()).toBeNull();
  });

  it('failed payment keeps the cart and drops the marker', () => {
    setup();
    service.mark('tn-1');
    getOrderDetails.and.returnValue(of({status: 'PAYMENT_FAILED'}));
    expect(reconcile()).toBe('failed');
    expect(clearCart).not.toHaveBeenCalled();
    expect(service.get()).toBeNull();
  });

  it('payment still open keeps both', () => {
    setup();
    service.mark('tn-1');
    getOrderDetails.and.returnValue(of({status: 'PAYMENT_WAITING'}));
    expect(reconcile()).toBe('waiting');
    expect(clearCart).not.toHaveBeenCalled();
    expect(service.get()).toBe('tn-1');
  });

  it('backend error keeps the cart; 404 drops the marker', () => {
    setup();
    service.mark('tn-1');
    getOrderDetails.and.returnValue(throwError(() => ({status: 0})));
    expect(reconcile()).toBe('none');
    expect(service.get()).toBe('tn-1');
    getOrderDetails.and.returnValue(throwError(() => ({status: 404})));
    expect(reconcile()).toBe('none');
    expect(service.get()).toBeNull();
    expect(clearCart).not.toHaveBeenCalled();
  });

  it('expired marker is ignored', () => {
    setup();
    localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({trackingNumber: 'tn-1', createdAt: Date.now() - PENDING_PAYMENT_TTL_MS - 1}));
    expect(service.get()).toBeNull();
    expect(localStorage.getItem(PENDING_PAYMENT_KEY)).toBeNull();
  });

  it('settle clears only for the marked order and not on PAYMENT_FAILED', () => {
    setup();
    service.mark('tn-1');
    expect(service.settle('other', 'PENDING')).toBe('none');
    expect(clearCart).not.toHaveBeenCalled();
    expect(service.settle('tn-1', 'PAYMENT_FAILED')).toBe('failed');
    expect(clearCart).not.toHaveBeenCalled();
    service.mark('tn-1');
    expect(service.settle('tn-1', 'PAYMENT_WAITING')).toBe('paid');
    expect(clearCart).toHaveBeenCalledTimes(1);
    expect(service.get()).toBeNull();
  });

  it('does nothing during SSR', () => {
    setup('server');
    service.mark('tn-1');
    expect(service.get()).toBeNull();
    expect(reconcile()).toBe('none');
  });
});
