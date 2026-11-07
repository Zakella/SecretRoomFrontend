import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {CartCalculation, CartCalculationRequest} from '../../entities/promotion';

/** SR-229: cart totals with promotions, computed by WebStoreBackend (no auth). */
@Injectable({providedIn: 'root'})
export class CartCalculationApi {
  private http = inject(HttpClient);
  private url = environment.apiUrl + 'v1/cart/calculate';

  calculate(request: CartCalculationRequest): Observable<CartCalculation> {
    return this.http.post<CartCalculation>(this.url, request);
  }
}
