import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ProductCategory {
/*
  private baseUrL = environment.apiUrl +"categories"

  constructor(private httpClient: HttpClient) {
  }

  getCategoriesByBrand(brandId: string): Observable<ProductCategory[]> {
    const timestamp = new Date().getTime();
    const url = `${this.baseUrL}/brand/${brandId}?nocache=${timestamp}`;
    // const url = `${this.baseUrL}/brand/${brandId}`;

    return this.httpClient.get<ProductCategory[]>(url);
  }

  getCurrentProductCategory(categoryId: string): Observable<ProductCategory> {
    const timestamp = new Date().getTime();
    const url = `${this.baseUrL}/${categoryId}?nocache=${timestamp}`;

    return this.httpClient.get<ProductCategory>(url);
  }

*/

}
