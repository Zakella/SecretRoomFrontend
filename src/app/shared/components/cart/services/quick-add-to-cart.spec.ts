import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {Subject, of, throwError} from 'rxjs';
import {Product} from '../../../../entities/product';
import {ProductVariant} from '../../../../entities/product-variant';
import {ProductService} from '../../../../@core/api/product';
import {Language} from '../../../../@core/services/language';
import {CartUi} from './cart';
import {needsSizeChoice, QuickAddToCart, resolveQuickAdd} from './quick-add-to-cart';

function product(overrides: Partial<Product> = {}): Product {
  return {id: '7', name: 'Item', price: 10, size: null, ...overrides} as Product;
}

function variant(size: string, overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {appId: 1, size, available: true, inStock: true, unitsInStock: 3, ...overrides};
}

describe('resolveQuickAdd', () => {
  it('asks for a choice for a bra with several sizes', () => {
    const full = product({variants: [variant('70A', {appId: 1}), variant('75B', {appId: 2})]});
    expect(resolveQuickAdd(full)).toEqual({action: 'choose'});
    expect(needsSizeChoice(full)).toBeTrue();
  });

  it('adds the only in-stock real size of a perfume with its variant id', () => {
    const full = product({variants: [variant('250 ml', {appId: 11}), variant('One', {appId: 12, unitsInStock: 0, inStock: false})]});
    expect(resolveQuickAdd(full)).toEqual({action: 'add', size: {sizeType: '250 ml', available: true}, variantAppId: 11});
  });

  it('adds a single variant', () => {
    const full = product({variants: [variant('M', {appId: 5})]});
    expect(resolveQuickAdd(full)).toEqual({action: 'add', size: {sizeType: 'M', available: true}, variantAppId: 5});
  });

  it('adds a one-size variant without size', () => {
    const full = product({variants: [variant('One Size', {appId: 6})]});
    expect(resolveQuickAdd(full)).toEqual({action: 'add', size: undefined, variantAppId: 6});
  });

  it('does nothing when no variant is in stock', () => {
    const full = product({variants: [variant('M', {unitsInStock: 0})]});
    expect(resolveQuickAdd(full)).toEqual({action: 'none'});
  });

  it('asks for a choice for several legacy productSizes', () => {
    const full = product({productSizes: [{sizeType: 'S'}, {sizeType: 'M'}]});
    expect(needsSizeChoice(full)).toBeTrue();
  });

  it('adds a single legacy productSize', () => {
    const full = product({productSizes: [{sizeType: 'S'}]});
    expect(resolveQuickAdd(full)).toEqual({action: 'add', size: {sizeType: 'S', available: true}});
  });

  it('uses product.size when there is nothing else', () => {
    expect(resolveQuickAdd(product({size: 'XS'}))).toEqual({action: 'add', size: {sizeType: 'XS', available: true}});
  });

  it('adds without size for a one-size product', () => {
    expect(resolveQuickAdd(product({size: 'One'}))).toEqual({action: 'add'});
    expect(resolveQuickAdd(product())).toEqual({action: 'add'});
  });
});

describe('QuickAddToCart', () => {
  let getProductById: jasmine.Spy;
  let addToCart: jasmine.Spy;
  let navigate: jasmine.Spy;
  let close: jasmine.Spy;
  let service: QuickAddToCart;

  beforeEach(() => {
    getProductById = jasmine.createSpy('getProductById');
    addToCart = jasmine.createSpy('addToCart');
    navigate = jasmine.createSpy('navigate').and.resolveTo(true);
    close = jasmine.createSpy('close');
    TestBed.configureTestingModule({
      providers: [
        {provide: ProductService, useValue: {getProductById}},
        {provide: CartUi, useValue: {addToCart, close}},
        {provide: Router, useValue: {navigate}},
        {provide: Language, useValue: {currentLanguage: () => 'ro'}},
      ],
    });
    service = TestBed.inject(QuickAddToCart);
  });

  it('adds immediately when no size choice is needed', () => {
    getProductById.and.returnValue(of(product({variants: [variant('250 ml', {appId: 11})]})));
    service.add(product());
    expect(getProductById).toHaveBeenCalledWith('7');
    expect(addToCart).toHaveBeenCalledTimes(1);
    const item = addToCart.calls.mostRecent().args[0];
    expect(item.size).toEqual({sizeType: '250 ml', available: true});
    expect(item.variantAppId).toBe(11);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('navigates to the product page when a size choice is needed', () => {
    getProductById.and.returnValue(of(product({variants: [variant('S'), variant('M')]})));
    service.add(product());
    expect(addToCart).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/', 'ro', 'product', '7', 'item']);
  });

  it('closes the cart drawer after navigating to the product page', async () => {
    getProductById.and.returnValue(of(product({variants: [variant('S'), variant('M')]})));
    service.add(product());
    await navigate.calls.mostRecent().returnValue;
    expect(close).toHaveBeenCalled();
  });

  it('navigates on load error', () => {
    getProductById.and.returnValue(throwError(() => new Error('boom')));
    service.add(product());
    expect(addToCart).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledTimes(1);
  });

  it('ignores a repeated add while loading', () => {
    const subj = new Subject<Product>();
    getProductById.and.returnValue(subj);
    service.add(product());
    service.add(product());
    expect(getProductById).toHaveBeenCalledTimes(1);
    subj.next(product());
    subj.complete();
    expect(addToCart).toHaveBeenCalledTimes(1);
    service.add(product());
    expect(getProductById).toHaveBeenCalledTimes(2);
  });
});
