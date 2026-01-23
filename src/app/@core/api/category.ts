import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private apiUrl = 'https://api-sr.solterprise.com/api/web-categories/hierarchy/active'

  getCategories(): Observable<any> {
    return this.http.get(this.apiUrl);
  }

}
