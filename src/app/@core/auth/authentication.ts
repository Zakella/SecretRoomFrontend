import {inject, Injectable, signal} from '@angular/core';
import {environment} from '../../../environments/environment';
import {BehaviorSubject, Observable, Subscriber, tap} from 'rxjs';

import {HttpClient} from '@angular/common/http';
import { JwtHelperService } from '@auth0/angular-jwt';
import {UserDetails} from '../../entities/user-details';
import {User} from '../api/user';
import {toSignal} from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root'
})
export class Authentication {
  private jwtHelper = new JwtHelperService();
  loggedIn = new BehaviorSubject<boolean>(this.hasValidTokenInLocalStorage());
  logged = toSignal(this.loggedIn, { initialValue: false });
  private  http = inject(HttpClient);

  isLoggedIn(): Observable<boolean> {
    return new Observable<boolean>(subscriber => {
      if (this.hasValidTokenInLocalStorage()) {
        this.notifyLoggedInStatus(true, subscriber);
      } else {
        this.notifyLoggedInStatus(false, subscriber);
        if (this.isBrowser()) {
          localStorage.removeItem('user');
        }
      }
      subscriber.complete();
    });
  }

  private hasValidTokenInLocalStorage(): boolean {
    if (this.isBrowser()) {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "null") {
        const userDetails: UserDetails = JSON.parse(storedUser);
        const token = userDetails.accessToken;
        return Boolean(token) && !this.jwtHelper.isTokenExpired(token);
      }
    }
    return false;
  }

  private notifyLoggedInStatus(isLoggedIn: boolean, subscriber: Subscriber<boolean>) {
    this.loggedIn.next(isLoggedIn);
    subscriber.next(isLoggedIn);
  }

  registration(user: User): Observable<UserDetails> {
    const url = environment.apiUrl  + 'v1/users';
    return this.http.post<UserDetails>(url, user).pipe(
      tap((userDetails: UserDetails) => {
        this.loggedIn.next(true);
      })
    );
  }

  login(user: User): Observable<UserDetails> {
    const url = environment.apiUrl + 'v1/users/login';
    return this.http.post<UserDetails>(url, user).pipe(
      tap(() => {
        this.loggedIn.next(true);
      })
    );
  }

  logout(): void {
    const userDetails = this.getUserDetails();
    if (userDetails) {
      const token = userDetails.accessToken;
      const refreshToken = userDetails.refreshToken;
      if (token && refreshToken) {
        this.http.post(environment.apiUrl + 'v1/users/logout', {
          refresh_token: refreshToken
        }, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }).subscribe(() => {
            if (this.isBrowser()) {
              localStorage.removeItem('user');
            }
            this.loggedIn.next(false);
          });
      }
    }
  }

  getUserDetails(): UserDetails | null {
    if (this.isBrowser()) {
      const storedUser = localStorage.getItem("user");
      if (storedUser && storedUser !== "null") {
        return JSON.parse(storedUser);
      }
    }
    return null;
  }

  restorePassword(email: string, lang: string): Observable<any> {
    const url = environment.apiUrl +'v1/users/restore-password';
    return this.http.get(url, { params: { email, lang } });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    const url = environment.apiUrl +'v1/users/reset-password';
    return this.http.post<void>(url, { token, newPassword });
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}
