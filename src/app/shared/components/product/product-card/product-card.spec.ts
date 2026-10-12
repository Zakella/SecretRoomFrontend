import {PLATFORM_ID, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco, TranslocoService} from '@ngneat/transloco';
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

  describe('«+N» вариантов модели', () => {
    function render(p: Partial<Product>, lang: 'ro' | 'ru' = 'ro'): HTMLElement | null {
      currentLanguage.set(lang);
      TestBed.inject(TranslocoService).setActiveLang(lang);
      setProduct(product(p));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('.more-options');
    }
    const text = (el: HTMLElement | null) => el?.textContent?.trim();

    it('нет плашки и нет разметки при optionCount null, undefined, 0, 1', () => {
      for (const optionCount of [undefined, null as unknown as number, 0, 1]) {
        expect(render({optionCount, optionType: 'COLOR'})).withContext(String(optionCount)).toBeNull();
      }
    });

    it('ru: тип и склонение (optionCount - 1)', () => {
      expect(text(render({optionCount: 2, optionType: 'COLOR'}, 'ru'))).toBe('+1 цвет');
      expect(text(render({optionCount: 4, optionType: 'COLOR'}, 'ru'))).toBe('+3 цвета');
      expect(text(render({optionCount: 6, optionType: 'COLOR'}, 'ru'))).toBe('+5 цветов');
      expect(text(render({optionCount: 12, optionType: 'COLOR'}, 'ru'))).toBe('+11 цветов');
      expect(text(render({optionCount: 22, optionType: 'COLOR'}, 'ru'))).toBe('+21 цвет');
      expect(text(render({optionCount: 4, optionType: 'SCENT'}, 'ru'))).toBe('+3 аромата');
      expect(text(render({optionCount: 4, optionType: 'SHADE'}, 'ru'))).toBe('+3 оттенка');
    });

    it('ro: тип и склонение, 20+ с «de»', () => {
      expect(text(render({optionCount: 2, optionType: 'COLOR'}))).toBe('+1 culoare');
      expect(text(render({optionCount: 4, optionType: 'COLOR'}))).toBe('+3 culori');
      expect(text(render({optionCount: 20, optionType: 'COLOR'}))).toBe('+19 culori');
      expect(text(render({optionCount: 21, optionType: 'COLOR'}))).toBe('+20 de culori');
      expect(text(render({optionCount: 4, optionType: 'SCENT'}))).toBe('+3 arome');
      expect(text(render({optionCount: 4, optionType: 'SHADE'}))).toBe('+3 nuanțe');
    });

    it('optionType null — нейтральное «варианта» (ru)', () => {
      expect(text(render({optionCount: 4, optionType: undefined}, 'ru'))).toBe('+3 варианта');
    });

    it('optionType неизвестный — нейтральное «opțiuni» (ro)', () => {
      expect(text(render({optionCount: 4, optionType: 'MYSTERY'}))).toBe('+3 opțiuni');
    });

    it('плашка лежит внутри image-wrapper (поверх фото, вне потока)', () => {
      const el = render({optionCount: 3, optionType: 'COLOR'})!;
      expect(el.parentElement!.classList.contains('image-wrapper')).toBeTrue();
    });
  });
});
