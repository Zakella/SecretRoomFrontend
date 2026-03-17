import {Injectable, inject} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, of, catchError} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductService} from '../../../@core/api/product';


@Injectable({providedIn: 'root'})
export class ProductResolver implements Resolve<Product | null> {
  private productService = inject(ProductService);

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<Product | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    return this.productService.getProductById(id).pipe(
      catchError(() => of(null))
    );
  }
}
