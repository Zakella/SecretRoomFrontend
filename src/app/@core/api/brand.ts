import {inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Brand} from '../../entities/category';
import {Observable} from 'rxjs';
import {GetResponse} from '../../entities/get-response';

@Injectable({
  providedIn: 'root',
})
export class BrandService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";
  brand = signal<string>('');

  gerAllBrands():Observable<Brand[]>{
    return this.http.get<Brand[]>(`${this.baseUrL}/brands`);
  }

  geProductsByBrand():Observable<GetResponse>{
    return this.http.get<GetResponse>(`${this.baseUrL}/brand/${this.brand()}`);
  }
}
