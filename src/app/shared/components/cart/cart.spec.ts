import {ChangeDetectorRef} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {Product} from '../../../entities/product';
import {Language} from '../../../@core/services/language';
import {Shipping} from '../../../@core/api/shipping';
import {RecommendedProductService} from '../product/recommended-products/recommended-product-service';
import {Cart} from './cart';
import {CartUi} from './services/cart';
import {QuickAddToCart} from './services/quick-add-to-cart';

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
      ],
    });
    const component = TestBed.runInInjectionContext(() => new Cart());
    const p = {id: '1'} as Product;
    (component as unknown as {addRecommendationToCart(p: Product): void}).addRecommendationToCart(p);
    expect(add).toHaveBeenCalledOnceWith(p);
  });
});
