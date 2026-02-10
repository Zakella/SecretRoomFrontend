import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Brand} from '../../entities/category';
import {Observable, of, tap} from 'rxjs';
import {GetResponse} from '../../entities/get-response';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";
  private brandsCache: Brand[] = [];

  gerAllBrands(): Observable<Brand[]> {
    if (this.brandsCache.length) {
      return of(this.brandsCache);
    }
    return this.http.get<Brand[]>(`${this.baseUrL}/brands`).pipe(
      tap(brands => this.brandsCache = brands)
    );
  }

  getProductsByBrand(brand: string, page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size);
    return this.http.get<GetResponse>(`${this.baseUrL}/brand/${brand}`, {params});
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
}