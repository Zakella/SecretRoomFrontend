import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NavigationStart, Router} from '@angular/router';
import {Observable, of, Subject, throwError} from 'rxjs';
import {ProductService} from '../../../../@core/api/product';
import {Language} from '../../../../@core/services/language';
import {Product} from '../../../../entities/product';
import {CartUi} from './cart';
import {QuickAddToCart} from './quick-add-to-cart';

const sized = {
  id: '3523', name: 'Bra', imageURL: null,
  variants: [
    {appId: 1, size: '70A', available: true, inStock: true, unitsInStock: 2},
    {appId: 2, size: '75B', available: false, inStock: false, unitsInStock: 0},
  ],
} as unknown as Product;

describe('QuickAddToCart', () => {
  let service: QuickAddToCart;
  let addToCart: jasmine.Spy;
  let navigate: jasmine.Spy;
  let close: jasmine.Spy;
  let events: Subject<unknown>;
  let getProductById: jasmine.Spy<(id: string | null) => Observable<Product>>;

  beforeEach(() => {
    addToCart = jasmine.createSpy('addToCart');
    navigate = jasmine.createSpy('navigate').and.returnValue(Promise.resolve(true));
    close = jasmine.createSpy('close');
    events = new Subject<unknown>();
    getProductById = jasmine.createSpy('getProductById').and.returnValue(of(sized));
    TestBed.configureTestingModule({
      providers: [
        {provide: ProductService, useValue: {getProductById}},
        {provide: CartUi, useValue: {addToCart, close}},
        {provide: Router, useValue: {navigate, events}},
        {provide: Language, useValue: {currentLanguage: signal('ro')}},
      ],
    });
    service = TestBed.inject(QuickAddToCart);
  });

  it('loads the full card and opens the picker for a sized product', () => {
    service.add({id: '3523', name: 'Bra'} as Product);
    expect(getProductById).toHaveBeenCalledWith('3523');
    expect(service.pending()?.options.length).toBe(2);
    expect(addToCart).not.toHaveBeenCalled();
  });

  it('adds right away when no size is needed', () => {
    getProductById.and.returnValue(of({id: '9', name: 'Candle', price: 5} as Product));
    service.add({id: '9'} as Product);
    expect(service.pending()).toBeNull();
    expect(addToCart).toHaveBeenCalledTimes(1);
    expect(addToCart.calls.mostRecent().args[0].size).toBeUndefined();
  });

  it('choose adds the item with size and variant and closes the picker', () => {
    service.add({id: '3523'} as Product);
    service.choose(service.pending()!.options[0]);
    const item = addToCart.calls.mostRecent().args[0];
    expect(item.size.sizeType).toBe('70A');
    expect(item.variantAppId).toBe(1);
    expect(item.product).toBe(sized);
    expect(service.pending()).toBeNull();
  });

  it('choose ignores an unavailable option', () => {
    service.add({id: '3523'} as Product);
    service.choose(service.pending()!.options[1]);
    expect(addToCart).not.toHaveBeenCalled();
    expect(service.pending()).not.toBeNull();
  });

  it('close drops the pending product', () => {
    service.add({id: '3523'} as Product);
    service.close();
    expect(service.pending()).toBeNull();
  });

  it('load error navigates to the product page, then closes the cart drawer', async () => {
    getProductById.and.returnValue(throwError(() => new Error('x')));
    service.add({id: '3523', name: 'Bra'} as Product);
    expect(addToCart).not.toHaveBeenCalled();
    expect(close).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(close).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith(['/', 'ro', 'product', '3523', jasmine.any(String)]);
    expect(service.loadingId()).toBeNull();
  });

  it('ignores a repeated add while the same product is loading', () => {
    const subject = new Subject<Product>();
    getProductById.and.returnValue(subject);
    service.add({id: '3523'} as Product);
    service.add({id: '3523'} as Product);
    expect(getProductById).toHaveBeenCalledTimes(1);
    expect(service.loadingId()).toBe('3523');
    subject.next(sized);
    expect(service.loadingId()).toBeNull();
  });

  it('NavigationStart closes the open picker', () => {
    service.add({id: '3523'} as Product);
    expect(service.pending()).not.toBeNull();
    events.next(new NavigationStart(1, '/ro/somewhere'));
    expect(service.pending()).toBeNull();
  });

  it('only the last add counts: the answer for the first product is ignored', () => {
    const first = new Subject<Product>();
    const second = new Subject<Product>();
    getProductById.and.callFake(id => (id === 'a' ? first : second));
    service.add({id: 'a'} as Product);
    service.add({id: 'b'} as Product);
    expect(service.loadingId()).toBe('b');
    first.next(sized);
    expect(service.pending()).toBeNull();
    expect(service.loadingId()).toBe('b');
    second.next(sized);
    expect(service.pending()?.product).toBe(sized);
    expect(service.loadingId()).toBeNull();
  });

  it('isLoading is true only for the product being loaded', () => {
    getProductById.and.returnValue(new Subject<Product>());
    service.add({id: '3523'} as Product);
    expect(service.isLoading({id: '3523'} as Product)).toBeTrue();
    expect(service.isLoading({id: '1'} as Product)).toBeFalse();
    expect(service.isLoading(undefined)).toBeFalse();
  });
});
