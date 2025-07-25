import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class Purchase {
  private url = environment.apiUrl +'v1/order';
  private http= inject(HttpClient);


/*  placeOrder (purchase: Purchase): Observable<ResponsePurchase> {
    return this.http.post<ResponsePurchase>(this.url, purchase);
  }

  getOrderDetails(orderUuid: String): Observable<OrderReview> {
    return this.http.get<OrderReview>(`${this.url}/${orderUuid}`);
  }*/

}
