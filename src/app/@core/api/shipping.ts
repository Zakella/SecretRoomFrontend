import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Shipping {
  private apiUrl = environment.apiUrl +'v1/shipping';
  private http= inject(HttpClient);

/*  getShippingOptions(): Observable<ShippingOption[]> {
    return this.http.get<ShippingOption[]>(this.apiUrl);
  }*/

}
