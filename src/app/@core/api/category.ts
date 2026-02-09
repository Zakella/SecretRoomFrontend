import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Category} from '../../entities/category';
import {environment} from '../../../environments/environment';
import {GetResponse} from '../../entities/get-response';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + "web-categories";
  private previewUrl = this.apiUrl + '/parents/product-preview';

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl + '/hierarchy/active');
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
}
