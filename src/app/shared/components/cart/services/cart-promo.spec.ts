import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {PLATFORM_ID} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {BehaviorSubject} from 'rxjs';
import {CartItem} from '../../../../entities/cart-item';
import {Product} from '../../../../entities/product';
import {CartCalculation} from '../../../../entities/promotion';
import {environment} from '../../../../../environments/environment';
import {CartUi} from './cart';
import {CART_PROMO_DEBOUNCE_MS, CartPromo, toLineView} from './cart-promo';

const URL = environment.apiUrl + 'v1/cart/calculate';

const item = (id: string, quantity: number, variantAppId?: number) =>
  new CartItem({id, name: `P${id}`, price: 100} as Product, quantity, undefined, variantAppId);

const calculation = (overrides: Partial<CartCalculation> = {}): CartCalculation => ({
  lines: [{
    productId: 12, variantAppId: 345, quantity: 2, unitPrice: 100, price: 100, lineTotal: 150, promotionSavings: 50,
    promotion: {id: 7, type: 'NTH_PERCENT', percent: 50, nth: 2, buy: null, free: null, onlineOnly: true},
    available: true,
  }],
  itemsTotal: 200, promotionSavings: 50, total: 150,
  ...overrides,
});

describe('CartPromo (SR-229)', () => {
  let items$: BehaviorSubject<CartItem[]>;
  let http: HttpTestingController;

  function create(platform: 'browser' | 'server', initial: CartItem[]): CartPromo {
    items$ = new BehaviorSubject<CartItem[]>(initial);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {provide: PLATFORM_ID, useValue: platform},
        {provide: CartUi, useValue: {cartItems: items$}},
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(CartPromo);
  }

  afterEach(() => http.verify());

  it('posts the cart after the debounce and exposes the server totals', fakeAsync(() => {
    const promo = create('browser', [item('12', 2, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS - 1);
    http.expectNone(URL);
    tick(1);
    const req = http.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({items: [{productId: 12, variantAppId: 345, quantity: 2}]});
    req.flush(calculation());
    expect(promo.view()).toEqual({lines: calculation().lines, itemsTotal: 200, promotionSavings: 50, total: 150});
    expect(promo.line(0)!.lineTotal).toBe(150);
    expect(promo.line(1)).toBeNull();
  }));

  it('error or an old webstore without the endpoint — no result, client totals stay', fakeAsync(() => {
    const promo = create('browser', [item('12', 2, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).flush('Not found', {status: 404, statusText: 'Not Found'});
    expect(promo.view()).toBeNull();
    expect(promo.line(0)).toBeNull();

    items$.next([item('12', 3, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).error(new ProgressEvent('network'));
    expect(promo.view()).toBeNull();
  }));

  it('a new change debounces and cancels the request in flight', fakeAsync(() => {
    const promo = create('browser', [item('12', 1)]);
    tick(100);
    items$.next([item('12', 2)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    const first = http.expectOne(URL);
    expect(first.request.body.items[0].quantity).toBe(2);

    items$.next([item('12', 3)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    expect(first.cancelled).toBeTrue();
    const second = http.expectOne(URL);
    expect(second.request.body.items[0].quantity).toBe(3);
    second.flush(calculation({lines: [{...calculation().lines[0], quantity: 3}]}));
    expect(promo.view()!.total).toBe(150);
  }));

  it('a result for an older cart state is not shown while the new one is calculated', fakeAsync(() => {
    const promo = create('browser', [item('12', 2, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).flush(calculation());
    expect(promo.view()).not.toBeNull();

    items$.next([item('12', 3, 345)]);
    expect(promo.view()).toBeNull();
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).flush(calculation());
    expect(promo.view()).not.toBeNull();
  }));

  it('empty cart — no request, no result', fakeAsync(() => {
    const promo = create('browser', []);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectNone(URL);
    expect(promo.view()).toBeNull();
  }));

  it('a line of an unknown product or a malformed answer — client totals', fakeAsync(() => {
    const promo = create('browser', [item('12', 2, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).flush(calculation({lines: [{...calculation().lines[0], available: false, lineTotal: 0}]}));
    expect(promo.view()).toBeNull();

    items$.next([item('12', 1, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS);
    http.expectOne(URL).flush(calculation({lines: []}));
    expect(promo.view()).toBeNull();
  }));

  it('SSR: does not post the cart', fakeAsync(() => {
    const promo = create('server', [item('12', 2, 345)]);
    tick(CART_PROMO_DEBOUNCE_MS * 2);
    http.expectNone(URL);
    expect(promo.view()).toBeNull();
  }));
});

describe('toLineView (SR-229)', () => {
  const line = (unitPrice: number, price: number, quantity: number, lineTotal: number) => ({
    productId: 1, variantAppId: null, quantity, unitPrice, price, lineTotal,
    promotionSavings: price * quantity - lineTotal, promotion: null, available: true,
  });

  it('no server line — null', () => {
    expect(toLineView(null)).toBeNull();
  });

  it('line at the base price: nothing crossed out', () => {
    expect(toLineView(line(320, 320, 1, 320))).toEqual({total: 320, oldTotal: null, promotion: null});
  });

  it('product discount without a promotion: base × qty crossed out, line total shown', () => {
    expect(toLineView(line(400, 320, 2, 640))).toEqual({total: 640, oldTotal: 800, promotion: null});
  });

  it('base × qty is rounded to the bani', () => {
    expect(toLineView(line(99.99, 99.99, 3, 249.97))!.oldTotal).toBe(299.97);
  });
});
