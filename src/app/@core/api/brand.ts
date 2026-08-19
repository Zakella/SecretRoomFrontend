import {inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Brand} from '../../entities/category';
import {Observable, of, tap, shareReplay} from 'rxjs';
import {GetResponse} from '../../entities/get-response';
import {FilterGroup} from '../../entities/filter-group';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";
  /** TTL кэша брендов. Совпадает с TTL кэша каталога на сервере. */
  private static readonly CACHE_TTL = 300000; // 5 минут

  private brandsCache: Brand[] = [];
  private brandsCachedAt = 0;

  /**
   * Реактивная копия списка брендов.
   * API товаров отдаёт только brandAlias («Victoria's Secret»), но URL брендовой страницы
   * строится из ключа бренда («VictoriasSecret» → victorias-secret). Слаг из алиаса
   * детерминированно не выводится, поэтому нужен справочник.
   */
  readonly brands = signal<Brand[]>([]);
  private brands$: Observable<Brand[]> | null = null;

  gerAllBrands(): Observable<Brand[]> {
    // Кэш свежий — отдаём синхронно.
    if (this.brandsCache.length && Date.now() - this.brandsCachedAt < BrandService.CACHE_TTL) {
      return of(this.brandsCache);
    }
    // Кэш пуст или протух. shareReplay склеивает параллельные вызовы (header/footer/меню
    // дёргают этот эндпоинт одновременно) — без него был лишний запрос на каждого подписчика.
    if (!this.brands$) {
      this.brands$ = this.http.get<Brand[]>(`${this.baseUrL}/brands`).pipe(
        tap(brands => {
          this.brandsCache = brands;
          this.brandsCachedAt = Date.now();
          this.brands.set(brands);
          this.brands$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.brands$;
  }

  getProductsByBrand(brand: string, page: number, size: number, filters?: string): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);
    if (filters) {
      params = params.set('filters', filters);
    }
    return this.http.get<GetResponse>(`${this.baseUrL}/brand/${brand}`, {params});
  }

  getFiltersForBrand(brand: string): Observable<FilterGroup[]> {
    return this.http.get<FilterGroup[]>(`${this.baseUrL}/brand/${brand}/filters`);
  }

  toSlug(brand: string): string {
    return brand
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .toLowerCase();
  }

  fromSlug(slug: string): string | null {
    return this.brandsCache.find(b => this.toSlug(b.brand) === slug)?.brand ?? null;
  }

  /** Слаг брендовой страницы по алиасу из карточки товара. null — бренд неизвестен. */
  slugForAlias(alias: string | null | undefined): string | null {
    if (!alias) return null;
    const normalized = alias.trim().toLowerCase();
    const found = this.brands().find(b => (b.brandAlias || b.brand).trim().toLowerCase() === normalized);
    return found ? this.toSlug(found.brand) : null;
  }
}