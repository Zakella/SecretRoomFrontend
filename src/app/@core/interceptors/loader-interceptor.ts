import {inject, Injectable} from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
} from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import {LoaderService} from '../../shared/components/loader/loader-service';

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {
  private loader = inject(LoaderService);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const noLoader = req.headers.get('X-No-Loader') === 'true';
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
