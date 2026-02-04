import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Brand} from '../../entities/category';
import {Observable} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";


  gerAllBrands():Observable<Brand[]>{
    return this.http.get<Brand[]>(`${this.baseUrL}/brands`);
  }
}
