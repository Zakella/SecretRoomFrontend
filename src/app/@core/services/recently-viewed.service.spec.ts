import {PLATFORM_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse} from '@angular/common/http';
import {Observable, of, throwError} from 'rxjs';
import {RecentlyViewedService} from './recently-viewed.service';
import {ProductService} from '../api/product';
import {Product} from '../../entities/product';

describe('RecentlyViewedService.revalidate (SR-173)', () => {
  const KEY = 'recently_viewed_products';
  let getProductById: jasmine.Spy<(id: string | null, silent?: boolean) => Observable<Product>>;

  function create(stored: Partial<Product>[]): RecentlyViewedService {
    localStorage.setItem(KEY, JSON.stringify(stored));
    TestBed.configureTestingModule({
      providers: [
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: ProductService, useValue: {getProductById}},
      ],
    });
    return TestBed.inject(RecentlyViewedService);
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    getProductById = jasmine.createSpy('getProductById');
  });

  it('убирает товар с 404 из списка и localStorage, остальные обновляет', () => {
    getProductById.and.callFake(id =>
      id === 'gone'
        ? throwError(() => new HttpErrorResponse({status: 404}))
        : of({id, price: 99, unitsInStock: 5} as Product));
    const service = create([{id: 'a', price: 1}, {id: 'gone', price: 2}, {id: 'b', price: 3}]);

    service.revalidate();

    expect(service.products().map(p => p.id)).toEqual(['a', 'b']);
    expect(service.products()[0].price).toBe(99);
    expect(JSON.parse(localStorage.getItem(KEY)!).map((p: Product) => p.id)).toEqual(['a', 'b']);
  });

  it('сетевая ошибка/5xx не выбрасывает товар', () => {
    getProductById.and.returnValue(throwError(() => new HttpErrorResponse({status: 500})));
    const service = create([{id: 'a'}, {id: 'b'}]);

    service.revalidate();

    expect(service.products().map(p => p.id)).toEqual(['a', 'b']);
  });

  it('проверяет только один раз за сессию, запросы без лоадера', () => {
    getProductById.and.callFake(id => of({id, unitsInStock: 5} as Product));
    const service = create([{id: 'a'}]);

    service.revalidate();
    service.revalidate();

    expect(getProductById).toHaveBeenCalledTimes(1);
    expect(getProductById).toHaveBeenCalledWith('a', true);
  });

  it('не перепроверяет при новой загрузке страницы, если отметка в sessionStorage свежая', () => {
    getProductById.and.callFake(id => of({id, unitsInStock: 5} as Product));
    create([{id: 'a'}]).revalidate();
    expect(getProductById).toHaveBeenCalledTimes(1);

    TestBed.resetTestingModule();
    create([{id: 'a'}]).revalidate();

    expect(getProductById).toHaveBeenCalledTimes(1);
  });

  it('перепроверяет, если отметки нет или она старше TTL', () => {
    getProductById.and.callFake(id => of({id, unitsInStock: 5} as Product));
    sessionStorage.setItem('recently_viewed_revalidated_at', String(Date.now() - 31 * 60 * 1000));

    create([{id: 'a'}]).revalidate();

    expect(getProductById).toHaveBeenCalledTimes(1);
  });

  it('SR-181: товар жив (200), но распродан - убирается из списка и localStorage', () => {
    getProductById.and.callFake(id =>
      of(id === 'sold' ? {id, unitsInStock: 0, inStock: false} as Product : {id, unitsInStock: 3} as Product));
    const service = create([{id: 'a'}, {id: 'sold'}, {id: 'b'}]);

    service.revalidate();

    expect(service.products().map(p => p.id)).toEqual(['a', 'b']);
    expect(JSON.parse(localStorage.getItem(KEY)!).map((p: Product) => p.id)).toEqual(['a', 'b']);
  });

  describe('addProduct (SR-181)', () => {
    it('добавляет товар в наличии', () => {
      const service = create([]);
      service.addProduct({id: 'a', unitsInStock: 2} as Product);
      expect(service.products().map(p => p.id)).toEqual(['a']);
    });

    it('не добавляет распроданную карточку', () => {
      const service = create([{id: 'a', unitsInStock: 2}]);
      service.addProduct({id: 'sold', unitsInStock: 0, inStock: false} as Product);
      expect(service.products().map(p => p.id)).toEqual(['a']);
      expect(JSON.parse(localStorage.getItem(KEY)!).map((p: Product) => p.id)).toEqual(['a']);
    });

    it('если карточка стала распроданной - прежний снимок убирается', () => {
      const service = create([{id: 'a', unitsInStock: 2}, {id: 'b', unitsInStock: 1}]);
      service.addProduct({id: 'a', unitsInStock: 0, inStock: false} as Product);
      expect(service.products().map(p => p.id)).toEqual(['b']);
      expect(JSON.parse(localStorage.getItem(KEY)!).map((p: Product) => p.id)).toEqual(['b']);
    });

    it('не добавляет снятый с продажи', () => {
      const service = create([]);
      service.addProduct({id: 'd', unitsInStock: 5, discontinued: true} as Product);
      expect(service.products()).toEqual([]);
    });
  });
});
