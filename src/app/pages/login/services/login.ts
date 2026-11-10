import {inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {Authentication} from '../../../@core/auth/authentication';
import {User} from '../../../@core/api/user';
import {Router} from '@angular/router';
import {Language} from '../../../@core/services/language';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';

/** Value of the login form (email + password). */
export type LoginPayload = Partial<{ email: string | null; password: string | null }>;

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  badCredentials = signal(false);
  private authenticationService = inject(Authentication);
  private router = inject(Router);
  private langService = inject(Language);
  private ga = inject(GoogleAnalytics);
  private platformId = inject(PLATFORM_ID);
  activeLang = this.langService.currentLanguage;

  login(user: LoginPayload): void {
    this.badCredentials.set(false);
    this.authenticationService.login(user as unknown as User).subscribe({
      next: (authResponse) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(authResponse));
        }
        this.ga.send({
          event: 'login',
          category: 'engagement',
          label: 'email'
        });
        this.router.navigate(['/', this.activeLang(), 'cabinet']);
      },
      error: (err) => {
        if (err.status === 401) {
          this.badCredentials.set(true);
          setTimeout(() => this.badCredentials.set(false), 3000);
        }
      }
    });
  }
}
