import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import { ShippingOption } from '../../entities/shipping-options';

@Injectable({
  providedIn: 'root'
})
export class Shipping {
  private http= inject(HttpClient);
  private apiUrl = environment.apiUrl +'v1/shipping';

  getShippingOptions(): Observable<ShippingOption[]> {
    return this.http.get<ShippingOption[]>(this.apiUrl);
  }
}
