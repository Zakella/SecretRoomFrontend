import {Injectable, inject} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable, of, catchError} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductService} from '../../../@core/api/product';


@Injectable({providedIn: 'root'})
export class ProductResolver implements Resolve<Product | null> {
  private productService = inject(ProductService);
  private router = inject(Router);

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Product | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    return this.productService.getProductById(id).pipe(
      catchError(err => {
        console.error('Product fetch error', err);
        this.router.navigate(['/404']);
        return of(null);
      })
    );
  }
}
