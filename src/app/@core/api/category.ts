import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, of, tap, shareReplay} from 'rxjs';
import {Category} from '../../entities/category';
import {FilterGroup} from '../../entities/filter-group';
import {environment} from '../../../environments/environment';
import {GetResponse} from '../../entities/get-response';
import {Slugify} from '../services/slugify';
import {map} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private slugify = inject(Slugify);
  private apiUrl = environment.apiUrl + "web-categories";
  private previewUrl = this.apiUrl + '/parents/product-preview';

  /** TTL кэша категорий. Совпадает с TTL кэша каталога на сервере. */
  private static readonly CACHE_TTL = 300000; // 5 минут

  private categoriesCache: Category[] = [];
  private categoriesCachedAt = 0;
  private categories$: Observable<Category[]> | null = null;

  getCategories(): Observable<Category[]> {
    // Кэш свежий — отдаём синхронно.
    if (this.categoriesCache.length > 0 && Date.now() - this.categoriesCachedAt < CategoryService.CACHE_TTL) {
      return of(this.categoriesCache);
    }
    // Кэш пуст или протух. shareReplay склеивает параллельные вызовы (header/footer/меню
    // дёргают этот эндпоинт одновременно) — без него был лишний запрос на каждого подписчика.
    if (!this.categories$) {
      this.categories$ = this.http.get<Category[]>(this.apiUrl + '/hierarchy/active').pipe(
        tap(categories => {
          this.categoriesCache = categories;
          this.categoriesCachedAt = Date.now();
          this.categories$ = null;
        }),
        shareReplay(1)
      );
    }
    return this.categories$;
  }

  getCategoriesWithPreview(): Observable<any[]> {
    return this.http.get<any[]>(this.previewUrl);
  }

  getProductsByGroupId(categoryId: string | null, thePage: number, thePageSize: number, brand?: string, filters?: string): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString())
      .set('sort', 'id,asc');
    if (brand) {
      params = params.set('brand', brand);
    }
    if (filters) {
      params = params.set('filters', filters);
    }
    return this.http.get<GetResponse>(`${this.apiUrl}/${categoryId}/products`, {params: params})
  }

  getBrandsForCategory(categoryId: string): Observable<{brand: string, brandAlias: string}[]> {
    return this.http.get<{brand: string, brandAlias: string}[]>(`${this.apiUrl}/${categoryId}/brands`);
  }

  getFiltersForCategory(categoryId: string): Observable<FilterGroup[]> {
    return this.http.get<FilterGroup[]>(`${this.apiUrl}/${categoryId}/filters`);
  }

  // Helper to find category ID by slug
  getCategoryIdBySlug(slug: string): Observable<number | null> {
    return this.getCategories().pipe(
      map(categories => {
        const flatCategories = this.flattenCategories(categories);
        const found = flatCategories.find(c =>
          c.slug === slug
          || this.slugify.transform(c.name) === slug
          || this.slugify.transform(c.nameRo) === slug
          || this.slugify.transform(c.nameRu) === slug
        );
        return found ? found.id : null;
      })
    );
  }

  getCategoryBySlug(slug: string): Observable<Category | null> {
    return this.getCategories().pipe(
      map(categories => {
        const flatCategories = this.flattenCategories(categories);
        return flatCategories.find(c =>
          c.slug === slug
          || this.slugify.transform(c.name) === slug
          || this.slugify.transform(c.nameRo) === slug
          || this.slugify.transform(c.nameRu) === slug
        ) || null;
      })
    );
  }

  private flattenCategories(categories: Category[]): Category[] {
    let result: Category[] = [];
    for (const cat of categories) {
      result.push(cat);
      if (cat.children) {
        result = [...result, ...this.flattenCategories(cat.children)];
      }
    }
    return result;
  }
}
