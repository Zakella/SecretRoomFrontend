import {inject, Injectable} from '@angular/core';
import {environment} from '../../../../../environments/environment';
import {HttpClient} from '@angular/common/http';
import {catchError, Observable, throwError} from 'rxjs';
import { RecommendedProduct } from '../../../../entities/recommended-product';
import { Product } from '../../../../entities/product';

@Injectable({
  providedIn: 'root'
})
export class RecommendedProductService {
  private baseUrL = environment.apiUrl + "recommended-products";
  private httpClient = inject(HttpClient)

  getRecommendedProducts(ownerId: string): Observable<RecommendedProduct[]> {
    return this.httpClient.get<RecommendedProduct[]>(`${this.baseUrL}/${ownerId}`).pipe(catchError(this.handleError));
  }

  getSmartRecommendations(ownerId: string): Observable<Product[]> {
    return this.httpClient.get<Product[]>(`${this.baseUrL}/smart/${ownerId}`).pipe(catchError(this.handleError));
  }

  getCartRecommendations(productAppIds: number[]): Observable<Product[]> {
    return this.httpClient.post<Product[]>(`${this.baseUrL}/cart`, productAppIds).pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    return throwError(error.message || error);
  }
}
