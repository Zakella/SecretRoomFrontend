import {Inject, inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from '@angular/router';
import {Observable} from 'rxjs';
import {Authentication} from '../auth/authentication';
import { Language } from '../services/language';

interface CanActivate {
  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree
}
@Injectable({
  providedIn: 'root'
})
export class AccessGuard implements CanActivate{
  private router = inject(Router);
  private authService = inject(Authentication);
  private langService = inject(Language);
  private lang = this.langService.currentLanguage;
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    if (!isPlatformBrowser(this.platformId)) {
      return true;
    }
    if (this.authService.hasActiveSession()) {
      return true;
    }

    return this.router.createUrlTree([this.lang(), 'profile']);
  }
}
