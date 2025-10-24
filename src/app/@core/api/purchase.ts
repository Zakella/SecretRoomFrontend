import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {ResponsePurchase} from '../../entities/response-purchase';
import {OrderReview} from '../../entities/order-review';

@Injectable()
export class Purchase {
  private http= inject(HttpClient);
  private url = environment.apiUrl +'v1/order';


  placeOrder (purchase: Purchase): Observable<ResponsePurchase> {
    return this.http.post<ResponsePurchase>(this.url, purchase);
  }

  getOrderDetails(orderUuid: String): Observable<OrderReview> {
    return this.http.get<OrderReview>(`${this.url}/${orderUuid}`);
  }
}
