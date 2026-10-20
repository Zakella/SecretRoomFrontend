import {signal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {Product} from '../../../../entities/product';
import {FavoritesService} from '../../../../@core/services/favorites';
import {Language} from '../../../../@core/services/language';
import {RecentlyViewedService} from '../../../../@core/services/recently-viewed.service';
import {QuickAddToCart} from '../../cart/services/quick-add-to-cart';
import {RecentlyViewed} from './recently-viewed';

describe('RecentlyViewed', () => {
  it('delegates add to cart to QuickAddToCart', () => {
    const add = jasmine.createSpy('add');
    TestBed.configureTestingModule({
      providers: [
        {provide: QuickAddToCart, useValue: {add}},
        {provide: RecentlyViewedService, useValue: {products: signal([]), revalidate: () => undefined}},
        {provide: Router, useValue: {navigate: () => Promise.resolve(true)}},
        {provide: FavoritesService, useValue: {}},
        {provide: Language, useValue: {currentLanguage: () => 'ro'}},
      ],
    });
    const component = TestBed.runInInjectionContext(() => new RecentlyViewed());
    const p = {id: '1'} as Product;
    (component as unknown as {addToCart(p: Product): void}).addToCart(p);
    expect(add).toHaveBeenCalledOnceWith(p);
  });
});
