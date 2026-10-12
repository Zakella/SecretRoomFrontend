import {Injectable, PLATFORM_ID, RESPONSE_INIT, inject} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {HttpErrorResponse} from '@angular/common/http';
import {Resolve, ActivatedRouteSnapshot, RedirectCommand, Router, RouterStateSnapshot} from '@angular/router';
import {Observable, of, catchError, map, switchMap, timeout} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductService} from '../../../@core/api/product';
import {Slugify} from '../../../@core/services/slugify';

/** Таймаут на два доп. запроса (redirect + карточка мастера): не держим рендер 404-страницы. */
const REDIRECT_LOOKUP_TIMEOUT_MS = 5000;

/**
 * Резолвер карточки товара.
 *
 * Погашенная карточка модели (findProduct → 404) ведёт на мастера через api/products/redirect/{appId}:
 *  - SSR: настоящий HTTP 301 + Location одним шагом (RESPONSE_INIT), слаг мастера берём из его карточки,
 *    поэтому middleware слагов в server.ts не делает второй 301;
 *  - браузер (избранное, «недавно смотрели», корзина хранят старые id): RedirectCommand с replaceUrl.
 * Любой другой исход (redirect 404, мастер не найден, 5xx/таймаут) — как раньше: null → страница «не найден» с 404.
 * Запрос redirect уходит ТОЛЬКО после 404 от findProduct: у активной карточки число запросов прежнее.
 */
@Injectable({providedIn: 'root'})
export class ProductResolver implements Resolve<Product | null> {
  private productService = inject(ProductService);
  private slugify = inject(Slugify);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);
  private responseInit = inject(RESPONSE_INIT, {optional: true});

  resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<Product | RedirectCommand | null> {
    const id = route.paramMap.get('id');
    if (!id) return of(null);

    return this.productService.getProductById(id).pipe(
      catchError((err: unknown) =>
        err instanceof HttpErrorResponse && err.status === 404
          ? this.followRedirect(id, route, state)
          : of(null))
    );
  }

  private followRedirect(id: string, route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<RedirectCommand | null> {
    return this.productService.getRedirect(id).pipe(
      timeout(REDIRECT_LOOKUP_TIMEOUT_MS),
      switchMap(({redirectToAppId}) => {
        const masterId = String(redirectToAppId ?? '');
        if (!/^\d+$/.test(masterId) || masterId === id) return of(null);
        return this.productService.getProductById(masterId).pipe(
          timeout(REDIRECT_LOOKUP_TIMEOUT_MS),
          map(master => this.redirectTo(masterId, master, route, state))
        );
      }),
      catchError(() => of(null))
    );
  }

  private redirectTo(masterId: string, master: Product | null, route: ActivatedRouteSnapshot, state: RouterStateSnapshot): RedirectCommand | null {
    const slug = this.slugify.transform(master?.name ?? '');
    if (!slug) return null;

    const lang = route.pathFromRoot.map(r => r.paramMap.get('lang')).find(l => l === 'ro' || l === 'ru') ?? 'ro';
    const queryIndex = state.url.indexOf('?');
    const query = queryIndex >= 0 ? state.url.slice(queryIndex) : '';
    const target = `/${lang}/product/${masterId}/${slug}${query}`;

    if (isPlatformServer(this.platformId)) {
      if (!this.responseInit) return null;
      const headers = new Headers(this.responseInit.headers);
      headers.set('Location', target);
      this.responseInit.status = 301;
      this.responseInit.statusText = 'Moved Permanently';
      this.responseInit.headers = headers;
      // Навигацию не отменяем: ответ (статус+Location) отдаст Angular SSR; тело — страница «не найден», для краулера не важно.
      return null;
    }
    return new RedirectCommand(this.router.parseUrl(target), {replaceUrl: true});
  }
}
