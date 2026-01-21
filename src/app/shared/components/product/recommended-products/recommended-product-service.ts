import {inject, Injectable} from '@angular/core';
import {environment} from '../../../../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
import { RecommendedProduct } from '../../../../entities/recommended-product';

@Injectable({
  providedIn: 'root'
})
export class RecommendedProductService {
  private baseUrL = environment.apiUrl + "recommended-products";
  private httpClient = inject(HttpClient)

  getRecommendedProducts(ownerId: string): Observable<RecommendedProduct[]> {
    return this.httpClient.get<RecommendedProduct[]>(`${this.baseUrL}/${ownerId}`).pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    return throwError(error.message || error);
  }
}
