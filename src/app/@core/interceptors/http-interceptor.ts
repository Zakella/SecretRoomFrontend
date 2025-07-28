import {HttpEvent, HttpHandler, HttpHeaders, HttpRequest} from '@angular/common/http';
import {Inject, Injectable, PLATFORM_ID} from '@angular/core';
import {Observable} from 'rxjs';
import {isPlatformBrowser} from '@angular/common';
import {UserDetails} from '../entities/user-details';
import {ProtectedEndpoints} from '../entities/protected-endpoints';

@Injectable({
  providedIn: 'root'
})
export class HttpInterceptor {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    console.log(`Request intercepted: ${req.urlWithParams}`);

    // Check if the request is for the API
    if (req.url.includes('/api/')) {
      if (isPlatformBrowser(this.platformId)) {  // Проверяем, выполняется ли в браузере
        const storedUser = localStorage.getItem("user");

        if (storedUser && storedUser !== "null") {
          const userDetails: UserDetails = JSON.parse(storedUser);
          const token = userDetails.accessToken;

          console.log(`Is protected endpoint: ${this.isProtectedEndpoint(req.url)}`);

          if (token && this.isProtectedEndpoint(req.url)) {
            const autReq = req.clone({
              headers: new HttpHeaders({ Authorization: "Bearer " + token })
            });

            console.log('Modified request:', autReq);
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
