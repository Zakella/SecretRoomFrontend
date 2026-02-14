import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {Authentication} from '../../../@core/auth/authentication';
import {Router} from '@angular/router';
import {Language} from '../../../@core/services/language';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';

@Injectable({
  providedIn: 'root'
})
export class LoginService {
  badCredentials: boolean = false
  private authenticationService = inject(Authentication);
  private router = inject(Router);
  private langService = inject(Language)
  private ga = inject(GoogleAnalytics)
  private platformId = inject(PLATFORM_ID)
  activeLang = this.langService.currentLanguage


  login(user: any) {
    this.authenticationService.login(user).subscribe({
      next: (authResponse) => {
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(authResponse));
        }
        this.ga.send({
          event: 'login',
          category: 'engagement',
          label: 'email'
        });
        this.router.navigate([this.activeLang(), 'cabinet']);
      },
      error: (err) => {
        if (err.status === 401) {
          this.badCredentials = true;
          setTimeout(() => this.badCredentials = false, 3000);

        }
      }
    });
  }
}
