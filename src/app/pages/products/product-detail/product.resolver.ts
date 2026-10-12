import {Injectable, inject} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {Observable, of, catchError} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductService} from '../../../@core/api/product';
import {productLoadErrorHandler} from './product-load-error';


@Injectable({providedIn: 'root'})
export class ProductResolver implements Resolve<Product | null> {
  private productService = inject(ProductService);
  private onLoadError = productLoadErrorHandler();

  resolve(route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): Observable<Product | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    return this.productService.getProductById(id).pipe(
      catchError(this.onLoadError)
    );
  }
}
