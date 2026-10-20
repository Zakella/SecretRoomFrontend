import {inject, Injectable} from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpContextToken,
} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import {LoaderService} from '../../shared/components/loader/loader-service';

/** Запрос без глобального лоадера. Через HttpContext: в сеть ничего не уходит, CORS не затронут. */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private loader = inject(LoaderService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const noLoader = req.context.get(SKIP_LOADER);
    const zone = req.headers.get('X-Loader-Zone') ?? 'global';

    if (!noLoader) {
      this.loader.show(zone);
    }

    return next.handle(req).pipe(
      finalize(() => {
        if (!noLoader) this.loader.hide(zone);
      })
    );
  }
}
