import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Product {
/*  constructor(private api: ProductApiService) {}

  getFeatured(): Observable<Product[]> {
    return this.api.getAll().pipe(
      map((products) => products.filter(p => p.featured))
    );
  }

  getAll(): Observable<Product[]> {
    return this.api.getAll();
  }

  getById(id: string): Observable<Product> {
    return this.api.getById(id);
  }

  create(product: Omit<Product, 'id'>) {
    return this.api.create(product);
  }

  update(id: string, product: Partial<Product>) {
    return this.api.update(id, product);
  }

  delete(id: string) {
    return this.api.delete(id);
  }
  */
}
