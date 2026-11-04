import {TestBed} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {isUnrecordedOrderError, SITE_EVENT_MAX_CART_LINES, SiteEvents} from './site-events';
import {CartItem} from '../../entities/cart-item';
import {Product} from '../../entities/product';

describe('SiteEvents', () => {
  let http: HttpTestingController | undefined;
  let service: SiteEvents;

  function setup(platform: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), {provide: PLATFORM_ID, useValue: platform}],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(SiteEvents);
  }

  const items = (n: number) => Array.from({length: n}, (_, i) =>
    new CartItem({id: String(i + 1), name: `P${i + 1}`, price: 5} as Product, 1));

  const failure = (error: unknown, cartItems = items(1)) => ({
    error: error as HttpErrorResponse, customerName: ' Ion Pop ', customerPhone: '069123456',
    paymentMethod: 'OnlinePayment', amount: 150, language: 'ro', cartItems,
  });

  afterEach(() => {
    // pure checks do not call setup() — nothing to verify then
    http?.verify();
    http = undefined;
    localStorage.clear();
  });

  it('decides what the backend could not record', () => {
    expect(isUnrecordedOrderError({status: 0, error: new ProgressEvent('error')})).toBeTrue();
    expect(isUnrecordedOrderError({status: 502, error: {message: 'x'}})).toBeTrue();
    expect(isUnrecordedOrderError({status: 503, error: '<html>'})).toBeTrue();
    expect(isUnrecordedOrderError({status: 504, error: null})).toBeTrue();
    expect(isUnrecordedOrderError({status: 500, error: null})).toBeTrue();
    expect(isUnrecordedOrderError({status: 500, error: '<html>bad gateway</html>'})).toBeTrue();
    expect(isUnrecordedOrderError({status: 409, error: {error: 'OUT_OF_STOCK'}})).toBeFalse();
    expect(isUnrecordedOrderError({status: 400, error: {message: 'bad'}})).toBeFalse();
    expect(isUnrecordedOrderError({status: 500, error: {message: 'boom'}})).toBeFalse();
    expect(isUnrecordedOrderError(null)).toBeFalse();
  });

  it('posts a CHECKOUT_ERROR event built by the contract', () => {
    setup();
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 504, statusText: 'Gateway Timeout', error: null})));
    const req = http!.expectOne(r => r.url.endsWith('v1/site-events'));
    const b = req.request.body;
    expect(req.request.method).toBe('POST');
    expect(b.eventId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(b.kind).toBe('CHECKOUT_ERROR');
    expect(b.source).toBe('FRONTEND');
    expect(b.step).toBe('ORDER_CREATE');
    expect(b.errorCode).toBe('SERVER_ERROR');
    expect(b.message).toBe('504 Gateway Timeout');
    expect(new Date(b.occurredAt).toISOString()).toBe(b.occurredAt);
    expect(b.customerName).toBe('Ion Pop');
    expect(b.customerPhone).toBe('069123456');
    expect(b.paymentMethod).toBe('OnlinePayment');
    expect(b.amount).toBe(150);
    expect(b.language).toBe('ro');
    expect(b.pageUrl).toBe(location.pathname);
    expect(b.userAgent.length).toBeLessThanOrEqual(500);
    expect(b.cart).toEqual([{appId: 1, variantAppId: null, name: 'P1', size: null, quantity: 1, price: 5}]);
    req.flush({});
  });

  it('status 0 is NETWORK, cart is capped at 100 lines', () => {
    setup();
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 0, statusText: 'Unknown Error'}), items(130)));
    const b = http!.expectOne(r => r.url.endsWith('v1/site-events')).request.body;
    expect(b.errorCode).toBe('NETWORK');
    expect(b.cart.length).toBe(SITE_EVENT_MAX_CART_LINES);
  });

  it('does not report errors the backend recorded', () => {
    setup();
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 409, error: {error: 'PRODUCT_UNAVAILABLE'}})));
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 500, error: {message: 'boom'}})));
    http!.expectNone(r => r.url.endsWith('v1/site-events'));
    expect().nothing();
  });

  it('swallows a failed report', () => {
    setup();
    expect(() => {
      service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 0})));
      http!.expectOne(r => r.url.endsWith('v1/site-events')).error(new ProgressEvent('error'));
    }).not.toThrow();
  });

  it('sends nothing during SSR', () => {
    setup('server');
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 0})));
    http!.expectNone(r => r.url.endsWith('v1/site-events'));
  });

  it('SR-207: carries visitorId only with cookie consent', () => {
    localStorage.clear();
    setup();
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 0})));
    const without = http!.expectOne(r => r.url.endsWith('v1/site-events')).request.body;
    expect(without.visitorId).toBeUndefined();
    expect(localStorage.getItem('sr_visitor_id')).toBeNull();

    localStorage.setItem('cookie_consent', 'accepted');
    TestBed.resetTestingModule();
    setup();
    service.reportOrderCreateFailure(failure(new HttpErrorResponse({status: 0})));
    const withConsent = http!.expectOne(r => r.url.endsWith('v1/site-events')).request.body;
    expect(withConsent.visitorId).toMatch(/^[0-9a-f-]{36}$/);
    expect(withConsent.visitorId).toBe(localStorage.getItem('sr_visitor_id'));
  });
});
