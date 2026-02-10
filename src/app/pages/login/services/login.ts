import {inject, Injectable} from '@angular/core';
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
  activeLang = this.langService.currentLanguage


  login(user: any) {
    this.authenticationService.login(user).subscribe({
      next: (authResponse) => {
        localStorage.setItem('user', JSON.stringify(authResponse))
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
