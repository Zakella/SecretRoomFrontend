import { Injectable } from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable, throwError} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {GetResponse} from '../../entities/get-response';

@Injectable({
  providedIn: 'root'
})
export class Product {
  private baseUrL = environment.apiUrl + "products";

  constructor(private httpClient: HttpClient) {}

  getProductsByGroupId(categoryId: string | null, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());

    return this.httpClient.get<GetResponse>(`${this.baseUrL}/${categoryId}`, { params: params })
      .pipe(catchError(this.handleError));
  }

  getAllProductsByBrand(brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());

    return this.httpClient.get<GetResponse>(`${this.baseUrL}/${brand}`,  { params: params })
      .pipe(catchError(this.handleError));
  }

  search(query: string, brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('name', query)
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());

    return this.httpClient.get<GetResponse>(`${this.baseUrL}/${brand}/searchByNameContaining`, { params: params })
      .pipe(catchError(this.handleError));
  }

  getAllProducts(): Observable<Product[]> {
    return this.httpClient.get<Product[]>(this.baseUrL + '/all')
      .pipe(catchError(this.handleError));


  }

  private handleError(error: any) {
    console.error('Something has gone wrong', error);
    return throwError(error.message || error);
  }

  getProductById(id: string | null): Observable<Product> {
    return this.httpClient.get<Product>(`${this.baseUrL}/findProduct/${id}`)
      .pipe(catchError(this.handleError));
  }
}

