import {Signal, signal, WritableSignal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {ProductService} from '../../../@core/api/product';
import {Language} from '../../../@core/services/language';
import {Brand} from '../../../entities/category';
import {BRAND_SEO, BrandSeoLocale} from '../../../@core/configs/brand-seo';
import {Catalog} from './catalog';

/** brandSlugValue/brandSeo/otherBrands объявлены protected — тест смотрит на них напрямую. */
interface CatalogInternals {
  brandName: WritableSignal<string | null>;
  allBrands: WritableSignal<Brand[]>;
  brandSlugValue: Signal<string | null>;
  brandSeo: Signal<BrandSeoLocale | null>;
  otherBrands: Signal<{slug: string, label: string}[]>;
}

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'BathAndBody', brandAlias: 'Bath & Body Works'},
  {brand: 'AnnSummers', brandAlias: ''},
];

describe('Catalog', () => {
  let catalog: CatalogInternals;
  const currentLanguage = signal('ro');

  beforeEach(() => {
    currentLanguage.set('ro');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: Language, useValue: {currentLanguage}},
        ProductService,
        Catalog,
      ],
    });

    catalog = TestBed.inject(Catalog) as unknown as CatalogInternals;
  });

  describe('brandSlugValue', () => {
    it('should be null outside a brand page', () => {
      expect(catalog.brandSlugValue()).toBeNull();
    });

    it('should slugify the brand key', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.brandSlugValue()).toBe('victorias-secret');
    });
  });

  describe('brandSeo', () => {
    it('should be null outside a brand page', () => {
      expect(catalog.brandSeo()).toBeNull();
    });

    it('should be null for a brand without hand-written copy (generic template takes over)', () => {
      catalog.brandName.set('Nayomi');
      expect(catalog.brandSeo()).toBeNull();
    });

    it('should return the Romanian copy of the current brand', () => {
      catalog.brandName.set('AnnSummers');
      expect(catalog.brandSeo()).toBe(BRAND_SEO['ann-summers'].ro);
    });

    it('should follow the active language', () => {
      catalog.brandName.set('AnnSummers');
      currentLanguage.set('ru');
      expect(catalog.brandSeo()).toBe(BRAND_SEO['ann-summers'].ru);
    });
  });

  describe('otherBrands', () => {
    beforeEach(() => {
      catalog.allBrands.set(BRANDS);
    });

    it('should be empty outside a brand page', () => {
      expect(catalog.otherBrands()).toEqual([]);
    });

    it('should exclude the brand currently being viewed', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands().map(b => b.slug)).toEqual(['bath-and-body', 'ann-summers']);
    });

    it('should label entries with the alias and fall back to the brand key', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([
        {slug: 'bath-and-body', label: 'Bath & Body Works'},
        {slug: 'ann-summers', label: 'AnnSummers'},
      ]);
    });

    it('should be empty when the catalog holds only the current brand', () => {
      catalog.allBrands.set([BRANDS[0]]);
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([]);
    });

    it('should be empty before the brand list is loaded', () => {
      catalog.allBrands.set([]);
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([]);
    });
  });
});
