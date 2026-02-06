import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Category} from '../../entities/category';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api-sr.solterprise.com/api/web-categories/hierarchy/active'
  private previewUrl = 'https://api-sr.solterprise.com/api/web-categories/parents/product-preview'

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(this.apiUrl);
  }

  getCategoriesWithPreview(): Observable<any[]> {
    return this.http.get<any[]>(this.previewUrl);
  }

}
