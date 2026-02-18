import {HttpEvent, HttpHandler, HttpHeaders, HttpInterceptor, HttpRequest} from '@angular/common/http';
import {Inject, Injectable, Optional, PLATFORM_ID} from '@angular/core';
import {Observable} from 'rxjs';
import {isPlatformBrowser, isPlatformServer} from '@angular/common';
import {UserDetails} from '../../entities/user-details';
import {ProtectedEndpoints} from '../../entities/protected-endpoints';
import {environment} from '../../../environments/environment';
import {SSR_API_URL} from '../tokens/ssr-api-url.token';


@Injectable({
  providedIn: 'root'
})
export class AuthInterceptor implements HttpInterceptor {

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    @Optional() @Inject(SSR_API_URL) private ssrApiUrl: string
  ) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    let processedReq = req;

    // During SSR, bypass Cloudflare by calling backend directly
    if (isPlatformServer(this.platformId) && this.ssrApiUrl && req.url.startsWith(environment.apiUrl)) {
      processedReq = req.clone({
        url: req.url.replace(environment.apiUrl, this.ssrApiUrl)
      });
    }

    if (processedReq.url.includes('/api/')) {
      if (isPlatformBrowser(this.platformId)) {
        const storedUser = localStorage.getItem("user");

        if (storedUser && storedUser !== "null") {
          const userDetails: UserDetails = JSON.parse(storedUser);
          const token = userDetails.accessToken;

          if (token && this.isProtectedEndpoint(processedReq.url)) {
            const autReq = processedReq.clone({
              setHeaders: { Authorization: "Bearer " + token }
            });
            return next.handle(autReq);
          }
        }
      }
    }

    return next.handle(processedReq);
  }

  private isProtectedEndpoint(url: string): boolean {
    return ProtectedEndpoints.ENDPOINTS.some(endpoint => url.includes(endpoint));
  }
}
