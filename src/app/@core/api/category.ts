import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {Category} from '../../entities/category';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "web-categories";

  getCategories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.baseUrL}/hierarchy/active`);
  }

  getParentsCategory(){
    return this.http.get<Category[]>(`${this.baseUrL}/parents/product-preview`);
  }
}
