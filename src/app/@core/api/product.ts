import {inject, Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {GetResponse} from '../../entities/get-response';
import {Product} from '../../entities/product';

@Injectable(
  {
    providedIn: 'root'
  }
)

export class ProductService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";

  getProductsByGroupId(categoryId: string | null, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());
    return this.http.get<GetResponse>(`${this.baseUrL}/${categoryId}`, {params: params})
  }

  getAllProductsByBrand(brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());
    return this.http.get<GetResponse>(`${this.baseUrL}/${brand}`, {params: params});
  }

  search(query: string, brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    let params = new HttpParams()
      .set('name', query)
      .set('page', thePage.toString())
      .set('size', thePageSize.toString());

    return this.http.get<GetResponse>(`${this.baseUrL}/${brand}/searchByNameContaining`, {params: params})
  }

  getAllProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(this.baseUrL + '/all')
  }


  getProductById(id: string | null): Observable<Product> {
    return this.http.get<Product>(`${this.baseUrL}/findProduct/${id}`)
  }

  getBestSellers(page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
    return this.http.get<GetResponse>(`${this.baseUrL}/bestsellers`, {params});
  }

  getNewArrivals(page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
    return this.http.get<GetResponse>(`${this.baseUrL}/new-arrivals`, {params});
  }

  getSales(page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
    return this.http.get<GetResponse>(`${this.baseUrL}/sales`, {params});
  }
}

