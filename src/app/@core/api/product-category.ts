import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {ProductCategory} from '../../entities/product-category';

@Injectable({
  providedIn: 'root'
})
export class ProductCategoryService {
  private baseUrL = environment.apiUrl +"categories"
  private http = inject(HttpClient);


  getCategoriesByBrand(brandId: string): Observable<ProductCategory[]> {
    const timestamp = new Date().getTime();
    const url = `${this.baseUrL}/brand/${brandId}?nocache=${timestamp}`;
    return this.http.get<ProductCategory[]>(url);
  }

  getCurrentProductCategory(categoryId: string): Observable<ProductCategory> {
    const timestamp = new Date().getTime();
    const url = `${this.baseUrL}/${categoryId}?nocache=${timestamp}`;
    return this.http.get<ProductCategory>(url);
  }
}
