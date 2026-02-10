import {computed, inject, Injectable, signal} from '@angular/core';
import {FormBuilder, ValidatorFn, Validators} from '@angular/forms';
import {Authentication} from '../../../@core/auth/authentication';
import {Router} from '@angular/router';
import {nameValidator, passwordValidator} from '../../../@core/validators/validators';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly fb = inject(FormBuilder);
  private authenticationService= inject(Authentication);
  private  router = inject(Router);
  private ga = inject(GoogleAnalytics);
  userExists = signal<boolean>(false);
  registrationForm = this.fb.group({
    email: ["", [Validators.required ,Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)]],
    password: ["", passwordValidator],
    firstName: ["", nameValidator],
    lastName: ["", nameValidator],
  });

  onSubmit(user: any): void {
    if (this.registrationForm.valid) {
      this.authenticationService.registration(user).subscribe(
        {
          next: authResponse => {
            localStorage.setItem('user', JSON.stringify(authResponse));
            this.ga.send({
              event: 'sign_up',
              category: 'engagement',
              label: 'email'
            });
            const lang = this.router.url.split('/')[1] || 'ru';
            this.router.navigate(['/', lang, 'cabinet']);
          },
          error: error => {
            if (error.status === 409) {
              this.userExists.set(true) ;
              setTimeout(
                () => this.userExists.set(false),
                3000);
            }
          }
        }
      );
    }
  }

}
