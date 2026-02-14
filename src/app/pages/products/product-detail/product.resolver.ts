import {Injectable, inject} from '@angular/core';
import {Resolve, ActivatedRouteSnapshot, RouterStateSnapshot, Router} from '@angular/router';
import {Observable, of, catchError} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductService} from '../../../@core/api/product';
import {Language} from '../../../@core/services/language';


@Injectable({providedIn: 'root'})
export class ProductResolver implements Resolve<Product | null> {
  private productService = inject(ProductService);
  private router = inject(Router);
  private langService = inject(Language);

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Product | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    return this.productService.getProductById(id).pipe(
      catchError(err => {
        console.error('Product fetch error', err);
        const lang = route.paramMap.get('lang') || this.langService.currentLanguage();
        this.router.navigate(['/', lang, 'not-found']);
        return of(null);
      })
    );
  }
}
