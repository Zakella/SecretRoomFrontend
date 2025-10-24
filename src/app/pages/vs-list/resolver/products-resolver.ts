/*
import {inject, Injectable } from '@angular/core';
import {ActivatedRouteSnapshot, Resolve, Router} from '@angular/router';
import {Product} from '../../../entities/product';
import {Observable, of} from 'rxjs';
import {catchError} from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ProductsResolver implements Resolve<Product | null>{
  private router = inject(Router);
  private productStore = inject(ProductsStore);

  resolve(route: ActivatedRouteSnapshot): Observable<Product | null> {
    const id = route.paramMap.get('id')!;
    return this.productStore.loadProduct(id).pipe(
      catchError(() => {
        this.router.navigate(['/not-found']);
        return of(null);
      })
    );
  }
}
*/
