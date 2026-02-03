import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {ResponsePurchase} from '../../entities/response-purchase';
import {OrderReview} from '../../entities/order-review';
import {Purchase as PurchaseData} from '../../entities/purchase';

@Injectable({providedIn: 'root'})
export class PurchaseService {
  private http = inject(HttpClient);
  private url = environment.apiUrl + 'v1/order';

  placeOrder(purchase: PurchaseData): Observable<ResponsePurchase> {
    return this.http.post<ResponsePurchase>(this.url, purchase);
  }

  getOrderDetails(orderUuid: string): Observable<OrderReview> {
    return this.http.get<OrderReview>(`${this.url}/${orderUuid}`);
  }
}
