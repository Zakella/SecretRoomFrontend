import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {Product} from '../../../../entities/product';
import {FavoritesService} from '../../../../@core/services/favorites';
import {Language} from '../../../../@core/services/language';
import {QuickAddToCart} from '../../cart/services/quick-add-to-cart';
import {RecommendedProductService} from './recommended-product-service';
import {RecommendedProducts} from './recommended-products';

describe('RecommendedProducts', () => {
  it('delegates add to cart to QuickAddToCart', () => {
    const add = jasmine.createSpy('add');
    TestBed.configureTestingModule({
      providers: [
        {provide: QuickAddToCart, useValue: {add}},
        {provide: RecommendedProductService, useValue: {getSmartRecommendations: () => of([])}},
        {provide: FavoritesService, useValue: {}},
        {provide: Language, useValue: {currentLanguage: () => 'ro'}},
      ],
    });
    const component = TestBed.runInInjectionContext(() => new RecommendedProducts());
    const p = {id: '1'} as Product;
    (component as unknown as {addToCart(p: Product): void}).addToCart(p);
    expect(add).toHaveBeenCalledOnceWith(p);
  });
});
