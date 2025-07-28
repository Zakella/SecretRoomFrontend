import {Component, inject} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ResetPasswordService} from './services/reset-password';

@Component({
  selector: 'app-reset-password',
  imports: [],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword {
  private router = inject(ActivatedRoute);
  private resetPassword = inject(ResetPasswordService);





/*
  ngOnInit() {
    this.route.queryParams
      .subscribe((params: any) => {
        this.token = params['token'];
      });
  }*/

/*  onSubmit() {
    this.errorMessage = null;

    const {password, passwordConfirmation} = this.form.value;
    if (!password) {
      return
    }

    if (password !== passwordConfirmation) {
      this.errorMessage = this.translocoService.translate('resetPassword.passwordsDoNotMatch');
      return;
    }


    if (this.token) {
      this.authenticationService.resetPassword(this.token, password).subscribe({
        next: () => {
          this.isSuccess = true;
        },
        error: (error: any) => {
          if (error.status === 404) {
            this.errorMessage = this.translocoService.translate('resetPassword.invalidOrExpiredToken');
          } else {
            this.errorMessage = this.translocoService.translate('resetPassword.errorOccurred');
          }
        }
      });
    } else {
      this.errorMessage = this.translocoService.translate('resetPassword.tokenMissing');
    }
  }*/

/*  goToLoginPage() {
    this.router.navigate(['/login'], {queryParams: {resetPassword: 'success'}});
  }*/
}
