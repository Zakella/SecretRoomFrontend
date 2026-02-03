import {HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {Observable} from 'rxjs';
import {isPlatformBrowser} from '@angular/common';
import {UserDetails} from '../../entities/user-details';
import {ProtectedEndpoints} from '../../entities/protected-endpoints';


@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (req.url.includes('/api/')) {
      if (isPlatformBrowser(this.platformId)) {
        const storedUser = localStorage.getItem("user");

        if (storedUser && storedUser !== "null") {
          const userDetails: UserDetails = JSON.parse(storedUser);
          const token = userDetails.accessToken;

          if (token && this.isProtectedEndpoint(req.url)) {
            const autReq = req.clone({
              headers: new HttpHeaders({ Authorization: "Bearer " + token })
            });
            return next.handle(autReq);
          }
        }
      }
    }


    return next.handle(req);
  }

  private isProtectedEndpoint(url: string): boolean {
    return ProtectedEndpoints.ENDPOINTS.some(endpoint => url.includes(endpoint));
  }
}
