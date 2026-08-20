import {PLATFORM_ID, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../../@core/configs/transloco-config';
import {BrandService} from '../../../../@core/api/brand';
import {Language} from '../../../../@core/services/language';
import {Brand} from '../../../../entities/category';
import {Product} from '../../../../entities/product';
import {ProductCard} from './product-card';

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'AnnSummers', brandAlias: 'Ann Summers'},
];

function product(overrides: Partial<Product> = {}): Product {
  return {id: '42', name: 'Cool Product', ...overrides} as Product;
}

describe('ProductCard', () => {
  let fixture: ComponentFixture<ProductCard>;
  let component: ProductCard;
  let brandService: BrandService;
  const currentLanguage = signal('ro');

  beforeEach(() => {
    localStorage.clear();
    currentLanguage.set('ro');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({
          config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
          loader: TranslocateHttpLoader,
        }),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: Language, useValue: {currentLanguage}},
      ],
    });

    fixture = TestBed.createComponent(ProductCard);
    component = fixture.componentInstance;
    brandService = TestBed.inject(BrandService);
    brandService.brands.set(BRANDS);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  function setProduct(p: Product | undefined): void {
    fixture.componentRef.setInput('product', p);
  }

  describe('brandUrl', () => {
    it('should be null when there is no product', () => {
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null when the product carries no brand alias', () => {
      setProduct(product({brandAlias: undefined}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null when the brand list has not been loaded', () => {
      brandService.brands.set([]);
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null for a brand that is not in the catalog', () => {
      setProduct(product({brandAlias: 'Nayomi'}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should build the brand catalog link from the alias', () => {
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toEqual(['/', 'ro', 'catalog', 'brand', 'victorias-secret']);
    });

    it('should follow the active language', () => {
      setProduct(product({brandAlias: 'Ann Summers'}));
      currentLanguage.set('ru');
      expect(component.brandUrl()).toEqual(['/', 'ru', 'catalog', 'brand', 'ann-summers']);
    });

    it('should recompute when the brand list arrives after the product', () => {
      brandService.brands.set([]);
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toBeNull();

      brandService.brands.set(BRANDS);
      expect(component.brandUrl()).toEqual(['/', 'ro', 'catalog', 'brand', 'victorias-secret']);
    });
  });

  describe('brand link rendering', () => {
    it('should render the brand as an anchor with a real href', () => {
      setProduct(product({brandAlias: "Victoria's Secret"}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('a.brand-link') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/ro/catalog/brand/victorias-secret');
    });

    it('should fall back to plain text when the brand cannot be resolved', () => {
      setProduct(product({brandAlias: 'Nayomi'}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('a.brand-link')).toBeNull();
      expect(fixture.nativeElement.querySelector('.brand-name')!.textContent!.trim()).toBe('Nayomi');
    });
  });
});
