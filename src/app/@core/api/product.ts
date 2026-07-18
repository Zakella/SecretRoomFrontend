import {inject, Injectable} from '@angular/core';
import {environment} from '../../../environments/environment';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {GetResponse} from '../../entities/get-response';
import {Product} from '../../entities/product';
import {FilterGroup} from '../../entities/filter-group';

@Injectable(
  {
    providedIn: 'root'
  }
)

export class ProductService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "products";



  getAllProductsByBrand(brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', thePage.toString())
      .set('size', thePageSize.toString())

    return this.http.get<GetResponse>(`${this.baseUrL}/${brand}`, {params: params});
  }

  search(query: string, brand: string, thePage: number, thePageSize: number): Observable<GetResponse> {
    const params = new HttpParams()
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

  getBestSellers(page: number, size: number, brand?: string, filters?: string): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
    if (brand) {
      params = params.set('brand', brand);
    }
    if (filters) {
      params = params.set('filters', filters);
    }
    return this.http.get<GetResponse>(`${this.baseUrL}/bestsellers`, {params});
  }

  getNewArrivals(page: number, size: number, brand?: string, filters?: string): Observable<GetResponse> {
    let params = new HttpParams()
      .set('page', page)
      .set('size', size)
    if (brand) {
      params = params.set('brand', brand);
    }
    if (filters) {
      params = params.set('filters', filters);
    }
    return this.http.get<GetResponse>(`${this.baseUrL}/new-arrivals`, {params});
  }

  getFiltersForBestsellers(): Observable<FilterGroup[]> {
    return this.http.get<FilterGroup[]>(`${this.baseUrL}/bestsellers/filters`);
  }

  getFiltersForNewArrivals(): Observable<FilterGroup[]> {
    return this.http.get<FilterGroup[]>(`${this.baseUrL}/new-arrivals/filters`);
  }

  getBrandsForBestsellers(): Observable<{brand: string, brandAlias: string}[]> {
    return this.http.get<{brand: string, brandAlias: string}[]>(`${this.baseUrL}/bestsellers/brands`);
  }

  getBrandsForNewArrivals(): Observable<{brand: string, brandAlias: string}[]> {
    return this.http.get<{brand: string, brandAlias: string}[]>(`${this.baseUrL}/new-arrivals/brands`);
  }

  getSales(page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('page', page)
      .set('size', size)
    return this.http.get<GetResponse>(`${this.baseUrL}/sales`, {params});
  }

  smartSearch(query: string, page: number, size: number): Observable<GetResponse> {
    const params = new HttpParams()
      .set('query', query)
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<GetResponse>(`${this.baseUrL}/search`, {params});
  }
}

