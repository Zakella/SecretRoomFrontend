import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {BrandService} from './brand';
import {Brand} from '../../entities/category';
import {environment} from '../../../environments/environment';

const BRANDS_URL = `${environment.apiUrl}products/brands`;

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'BathAndBody', brandAlias: 'Bath & Body Works'},
  {brand: 'AnnSummers', brandAlias: ''},
];

describe('BrandService', () => {
  let service: BrandService;
  let httpMock: HttpTestingController;
  let now: number;

  beforeEach(() => {
    now = 1_700_000_000_000;
    spyOn(Date, 'now').and.callFake(() => now);

    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(BrandService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  describe('toSlug', () => {
    it('should split camel case into kebab case', () => {
      expect(service.toSlug('VictoriasSecret')).toBe('victorias-secret');
      expect(service.toSlug('BathAndBody')).toBe('bath-and-body');
    });

    it('should replace spaces and underscores with hyphens', () => {
      expect(service.toSlug('Ann Summers')).toBe('ann-summers');
      expect(service.toSlug('Kiko_Milano')).toBe('kiko-milano');
    });
  });

  describe('slugForAlias', () => {
    beforeEach(() => {
      service.brands.set(BRANDS);
    });

    it('should return null for an empty alias', () => {
      expect(service.slugForAlias(null)).toBeNull();
      expect(service.slugForAlias(undefined)).toBeNull();
      expect(service.slugForAlias('')).toBeNull();
    });

    it('should map an alias to the brand page slug', () => {
      expect(service.slugForAlias("Victoria's Secret")).toBe('victorias-secret');
      expect(service.slugForAlias('Bath & Body Works')).toBe('bath-and-body');
    });

    it('should ignore casing and surrounding whitespace', () => {
      expect(service.slugForAlias("  victoria'S SECRET ")).toBe('victorias-secret');
    });

    it('should fall back to the brand key when the alias is empty', () => {
      expect(service.slugForAlias('AnnSummers')).toBe('ann-summers');
    });

    it('should return null for an unknown brand', () => {
      expect(service.slugForAlias('Nayomi')).toBeNull();
    });

    it('should return null before the brand list is loaded', () => {
      service.brands.set([]);
      expect(service.slugForAlias("Victoria's Secret")).toBeNull();
    });

    it('should not match on a partial alias', () => {
      expect(service.slugForAlias('Victoria')).toBeNull();
    });
  });

  describe('fromSlug', () => {
    it('should resolve a slug back to the brand key once brands are cached', () => {
      service.gerAllBrands().subscribe();
      httpMock.expectOne(BRANDS_URL).flush(BRANDS);
      expect(service.fromSlug('victorias-secret')).toBe('VictoriasSecret');
      expect(service.fromSlug('nayomi')).toBeNull();
    });
  });

  describe('gerAllBrands cache', () => {
    it('should collapse concurrent calls into a single request', () => {
      const first: Brand[][] = [];
      const second: Brand[][] = [];
      service.gerAllBrands().subscribe(b => first.push(b));
      service.gerAllBrands().subscribe(b => second.push(b));

      httpMock.expectOne(BRANDS_URL).flush(BRANDS);

      expect(first).toEqual([BRANDS]);
      expect(second).toEqual([BRANDS]);
    });

    it('should serve from cache while the TTL has not expired', () => {
      service.gerAllBrands().subscribe();
      httpMock.expectOne(BRANDS_URL).flush(BRANDS);

      now += 299_999;
      const cached: Brand[][] = [];
      service.gerAllBrands().subscribe(b => cached.push(b));

      httpMock.expectNone(BRANDS_URL);
      expect(cached).toEqual([BRANDS]);
    });

    it('should refetch once the TTL has expired', () => {
      service.gerAllBrands().subscribe();
      httpMock.expectOne(BRANDS_URL).flush(BRANDS);

      now += 300_001;
      const refreshed: Brand[] = [{brand: 'Pink', brandAlias: 'PINK'}];
      const received: Brand[][] = [];
      service.gerAllBrands().subscribe(b => received.push(b));

      httpMock.expectOne(BRANDS_URL).flush(refreshed);
      expect(received).toEqual([refreshed]);
      expect(service.brands()).toEqual(refreshed);
    });

    it('should publish the loaded brands on the signal', () => {
      expect(service.brands()).toEqual([]);
      service.gerAllBrands().subscribe();
      httpMock.expectOne(BRANDS_URL).flush(BRANDS);
      expect(service.brands()).toEqual(BRANDS);
    });
  });
});
