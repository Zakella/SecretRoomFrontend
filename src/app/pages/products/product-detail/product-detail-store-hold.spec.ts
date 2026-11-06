import {ComponentFixture, TestBed} from '@angular/core/testing';
import {CUSTOM_ELEMENTS_SCHEMA, signal} from '@angular/core';
import {Location} from '@angular/common';
import {ActivatedRoute, convertToParamMap, provideRouter, RouterLink} from '@angular/router';
import {of} from 'rxjs';
import {provideTransloco, TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../../@core/services/language';
import {MetaService} from '../../../@core/services/meta.service';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';
import {RecentlyViewedService} from '../../../@core/services/recently-viewed.service';
import {FavoritesService} from '../../../@core/services/favorites';
import {CartUi} from '../../../shared/components/cart/services/cart';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {CapitalizePipe} from '../../../shared/pipes/capitalize.pipe';
import {Product} from '../../../entities/product';
import {ProductVariant} from '../../../entities/product-variant';
import {StoreHoldState} from '../../../widgets/store-hold/store-hold-state';
import {ProductDetail} from './product-detail';

function variant(appId: number, size: string, stock: number, patch: Partial<ProductVariant> = {}): ProductVariant {
  return {appId, size, price: 499, available: stock > 0, inStock: stock > 0, unitsInStock: stock, ...patch};
}

function product(patch: Partial<Product> = {}): Product {
  return {
    id: '123', name: 'bra', nameRu: 'бюстгальтер', price: 499, imageURL: 'a.jpg', size: null,
    discountPercent: 0, oldPrice: 0, isNew: false, isBestSeller: false,
    variants: [variant(1, '70A', 2), variant(2, '75B', 0)],
    ...patch,
  };
}

// SR-223: visibility of «Отложить в магазине» on the product page. Children (gallery, recommendations…)
// are not rendered: only the actions block matters here.
describe('ProductDetail — hold in store button (SR-223)', () => {
  let fixture: ComponentFixture<ProductDetail>;
  const holdDisabled = signal(false);
  const holdOpen = jasmine.createSpy('holdOpen');
  const el = () => fixture.nativeElement as HTMLElement;
  const holdButton = () => el().querySelector<HTMLButtonElement>('.btn-store-hold');
  const sizeButtons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.variant-btn'));

  function setup(p: Product) {
    TestBed.configureTestingModule({
      imports: [ProductDetail],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {
          provide: ActivatedRoute,
          useValue: {snapshot: {data: {product: p}, queryParamMap: convertToParamMap({})}, data: of({product: p})},
        },
        {provide: MetaService, useValue: jasmine.createSpyObj('MetaService', ['setProductMeta', 'removeCanonicalAndAlternates'])},
        {provide: GoogleAnalytics, useValue: jasmine.createSpyObj('GoogleAnalytics', ['send', 'trackAddToCart'])},
        {provide: RecentlyViewedService, useValue: jasmine.createSpyObj('RecentlyViewedService', ['addProduct'])},
        {provide: FavoritesService, useValue: jasmine.createSpyObj('FavoritesService', {toggle: undefined, isFavorite: false})},
        {provide: CartUi, useValue: jasmine.createSpyObj('CartUi', ['addToCart'])},
        {provide: Location, useValue: jasmine.createSpyObj('Location', ['back'])},
        {provide: StoreHoldState, useValue: {disabled: holdDisabled.asReadonly(), open: holdOpen}},
      ],
    });
    TestBed.overrideComponent(ProductDetail, {
      set: {
        imports: [TranslocoPipe, LocalizedNamePipe, CapitalizePipe, RouterLink],
        providers: [],
        schemas: [CUSTOM_ELEMENTS_SCHEMA],
      },
    });
    fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
  }

  beforeEach(() => {
    holdDisabled.set(false);
    holdOpen.calls.reset();
  });

  it('size in stock: the button is there and opens the dialog for that size', () => {
    setup(product());
    expect(holdButton()).not.toBeNull();
    holdButton()!.click();
    expect(holdOpen).toHaveBeenCalledWith({
      productId: 123, variantAppId: 1, productName: 'Бюстгальтер', size: '70A', price: 499, imageUrl: 'a.jpg',
    });
  });

  it('selected size sold out: no button', () => {
    setup(product({variants: [variant(1, '70A', 2), variant(2, '75B', 0, {available: true})]}));
    fixture.componentInstance.selectVariant(fixture.componentInstance['product']()!.variants![1]);
    fixture.detectChanges();
    expect(holdButton()).toBeNull();
  });

  it('every size sold out: no button', () => {
    setup(product({variants: [variant(1, '70A', 0), variant(2, '75B', 0)]}));
    expect(holdButton()).toBeNull();
  });

  it('discontinued: no button', () => {
    setup(product({discontinued: true}));
    expect(holdButton()).toBeNull();
  });

  it('switched off (HOLD_DISABLED): the button disappears', () => {
    setup(product());
    expect(holdButton()).not.toBeNull();
    holdDisabled.set(true);
    fixture.detectChanges();
    expect(holdButton()).toBeNull();
  });

  it('product without sizes: held as the product itself', () => {
    setup(product({variants: [], unitsInStock: 3}));
    expect(sizeButtons().length).toBe(0);
    holdButton()!.click();
    expect(holdOpen).toHaveBeenCalledWith(jasmine.objectContaining({productId: 123, variantAppId: null, size: null}));
  });

  it('product without sizes and without stock: no button', () => {
    setup(product({variants: [], unitsInStock: 0}));
    expect(holdButton()).toBeNull();
  });

  it('one variant without a size label: the variant is held, without a size', () => {
    setup(product({variants: [variant(7, 'One Size', 4)]}));
    holdButton()!.click();
    expect(holdOpen).toHaveBeenCalledWith(jasmine.objectContaining({variantAppId: 7, size: null}));
  });
});
