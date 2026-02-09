import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, of, tap} from 'rxjs';
import {Category} from '../../entities/category';
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

  private categoriesCache: Category[] = [];

  getCategories(): Observable<Category[]> {
    if (this.categoriesCache.length > 0) {
      return of(this.categoriesCache);
    }
    return this.http.get<Category[]>(this.apiUrl + '/hierarchy/active').pipe(
      tap(categories => this.categoriesCache = categories)
    );
  }

  getCategoriesWithPreview(): Observable<any[]> {
    return this.http.get<any[]>(this.previewUrl);
  }

  getProductsByGroupId(categoryId: string | null, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());
    return this.http.get<GetResponse>(`${this.apiUrl}/${categoryId}/products`, {params: params})
  }

  // Helper to find category ID by slug
  getCategoryIdBySlug(slug: string): Observable<number | null> {
    return this.getCategories().pipe(
      map(categories => {
        const flatCategories = this.flattenCategories(categories);
        const found = flatCategories.find(c => this.slugify.transform(c.name) === slug);
        return found ? found.id : null;
      })
    );
  }

  getCategoryBySlug(slug: string): Observable<Category | null> {
    return this.getCategories().pipe(
      map(categories => {
        const flatCategories = this.flattenCategories(categories);
        return flatCategories.find(c => this.slugify.transform(c.name) === slug) || null;
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
