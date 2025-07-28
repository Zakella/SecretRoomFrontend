import {computed, inject, Injectable, signal} from '@angular/core';
import {Authentication} from '../../../@core/auth/authentication';
import {FormBuilder, ValidatorFn, Validators} from '@angular/forms';

@Injectable({
  providedIn: 'root'
})
export class ResetPasswordService {
  private authenticationService = inject(Authentication);
  public fb = inject(FormBuilder);
  form = computed(() => this.resetPasswordForm);
  error = signal<string | null>(null);

  passwordValidator: ValidatorFn[] = [
    Validators.required,
    Validators.minLength(8),
    Validators.pattern('^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$')
  ];


  resetPasswordForm = this.fb.group({
    password: ["", this.passwordValidator],
    passwordConfirmation: ["", Validators.required],
  });

/*
  onSubmit() {
    this.error.set(null)

    const {password, passwordConfirmation} = this.resetPasswordForm.value;
    if (!password) {
      return
    }

/!*
    if (password !== passwordConfirmation) {
      this.errorMessage = this.translocoService.translate('resetPassword.passwordsDoNotMatch');
      return;
    }
*!/


    if (this.token) {
      this.authenticationService.resetPassword(this.token, password).subscribe({
        next: () => {
          this.isSuccess = true;
        },
        error: (error: any) => {
          if (error.status === 404) {
/!*
            this.errorMessage = this.translocoService.translate('resetPassword.invalidOrExpiredToken');
*!/
          } else {
/!*
            this.errorMessage = this.translocoService.translate('resetPassword.errorOccurred');
*!/
          }
        }
      });
    } else {
/!*
      this.errorMessage = this.translocoService.translate('resetPassword.tokenMissing');
*!/
    }
  }
*/


}
