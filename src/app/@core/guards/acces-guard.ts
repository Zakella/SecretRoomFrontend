import {inject, Injectable, signal} from '@angular/core';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {Authentication} from '../auth/authentication';

interface CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree
}
@Injectable({
  providedIn: 'root'
})
export class AccessGuard implements CanActivate{
  private isLoggedIn = signal<boolean>(false);
  private router = inject(Router);
  private authService = inject(Authentication);

  constructor() {
    this.authService.isLoggedIn().subscribe(loggedIn => this.isLoggedIn.set(loggedIn));
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (this.isLoggedIn()) {
      return true;
    } else {
      this.router.navigate(['login']);
      return false;
    }
  }
}
