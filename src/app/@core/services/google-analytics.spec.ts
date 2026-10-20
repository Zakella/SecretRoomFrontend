import {PLATFORM_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {GoogleAnalytics} from './google-analytics';
import {OrderReview} from '../../entities/order-review';
import {CartItem} from '../../entities/cart-item';
import {Product} from '../../entities/product';

describe('GoogleAnalytics ecommerce', () => {
  let gtag: jasmine.Spy;
  const w = window as any;

  const order = (num = '00123'): OrderReview => ({
    orderNumber: num,
    totalAmountOrder: 450.555,
    shippingCost: 50,
    items: [{
      // product.id - внутренний id БД, в item_id попадать не должен
      product: {id: '999999', appId: '77', article: 'ART-1', name: 'Bra', brand: 'VS'} as any,
      sizeType: '75B', price: 200.5, quantity: 2, amount: 401,
    }, {
      product: {id: '888888', appId: '78', name: 'Mist'} as any,
      price: undefined, quantity: 1, amount: 0,
    }],
  } as any);

  function create(platform = 'browser'): GoogleAnalytics {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({providers: [{provide: PLATFORM_ID, useValue: platform}]});
    return TestBed.inject(GoogleAnalytics);
  }

  beforeEach(() => {
    localStorage.clear();
    gtag = jasmine.createSpy('gtag');
    w.gtag = gtag;
  });

  afterEach(() => {
    delete w.gtag;
    localStorage.clear();
  });

  it('sends purchase with all fields', () => {
    create().trackPurchase(order());
    expect(gtag).toHaveBeenCalledOnceWith('event', 'purchase', {
      transaction_id: '00123',
      value: 450.56,
      currency: 'MDL',
      shipping: 50,
      items: [
        {item_id: 'ART-1', item_name: 'Bra', item_variant: '75B', item_brand: 'VS', price: 200.5, quantity: 2},
        {item_id: '78', item_name: 'Mist', item_variant: undefined, item_brand: undefined, price: 0, quantity: 1},
      ],
    });
  });

  it('never uses internal product.id of an order item as item_id', () => {
    create().trackPurchase(order());
    const ids = gtag.calls.mostRecent().args[2].items.map((i: any) => i.item_id);
    expect(ids).not.toContain('999999');
    expect(ids).not.toContain('888888');
  });

  it('does not send purchase twice for the same order number', () => {
    const ga = create();
    ga.trackPurchase(order());
    ga.trackPurchase(order());
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('does not send after reload (new instance, flag in localStorage)', () => {
    create().trackPurchase(order());
    create().trackPurchase(order());
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem('ga4_purchase_sent')!)).toEqual(['00123']);
  });

  it('sends for a different order number', () => {
    const ga = create();
    ga.trackPurchase(order('00123'));
    ga.trackPurchase(order('00124'));
    expect(gtag).toHaveBeenCalledTimes(2);
  });

  it('keeps only the last 50 ids', () => {
    const ga = create();
    for (let i = 0; i < 55; i++) ga.trackPurchase(order('N' + i));
    const stored = JSON.parse(localStorage.getItem('ga4_purchase_sent')!);
    expect(stored.length).toBe(50);
    expect(stored[49]).toBe('N54');
  });

  it('skips an order without orderNumber', () => {
    create().trackPurchase({...order(), orderNumber: ''});
    expect(gtag).not.toHaveBeenCalled();
  });

  it('does nothing on the server platform', () => {
    const ga = create('server');
    ga.trackPurchase(order());
    ga.trackAddToCart({id: '1', name: 'x', price: 1} as Product, 1);
    ga.trackBeginCheckout([], 0);
    expect(gtag).not.toHaveBeenCalled();
  });

  it('does nothing when gtag is not loaded', () => {
    delete w.gtag;
    expect(() => create().trackPurchase(order())).not.toThrow();
  });

  it('does not throw and dedups in memory when localStorage throws', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('denied');
    spyOn(Storage.prototype, 'setItem').and.throwError('denied');
    const ga = create();
    expect(() => ga.trackPurchase(order())).not.toThrow();
    ga.trackPurchase(order());
    expect(gtag).toHaveBeenCalledTimes(1);
  });

  it('sends add_to_cart with currency, value and items (catalog id is the fallback item_id)', () => {
    const p = {id: '55', name: 'Bra', price: 100, brand: 'VS'} as Product;
    create().trackAddToCart(p, 2, '70A');
    expect(gtag).toHaveBeenCalledOnceWith('event', 'add_to_cart', {
      currency: 'MDL',
      value: 200,
      items: [{item_id: '55', item_name: 'Bra', item_variant: '70A', item_brand: 'VS', price: 100, quantity: 2}],
    });
  });

  it('sends begin_checkout with cart items', () => {
    const items = [
      new CartItem({id: '1', article: 'A1', name: 'One', price: 10} as Product, 2, {sizeType: 'M'} as any),
      new CartItem({id: '2', name: 'Two', price: 5.5} as Product, 1),
    ];
    create().trackBeginCheckout(items, 25.5);
    expect(gtag).toHaveBeenCalledOnceWith('event', 'begin_checkout', {
      currency: 'MDL',
      value: 25.5,
      items: [
        {item_id: 'A1', item_name: 'One', item_variant: 'M', item_brand: undefined, price: 10, quantity: 2},
        {item_id: '2', item_name: 'Two', item_variant: undefined, item_brand: undefined, price: 5.5, quantity: 1},
      ],
    });
  });
});
