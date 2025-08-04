import {Component, EventEmitter, Inject, inject, Output} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ResetPasswordService} from './services/reset-password';
import {FormBuilder, ReactiveFormsModule} from '@angular/forms';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-reset-password',
  imports: [
    ReactiveFormsModule,
    NgIf
  ],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss'
})
export class ResetPassword {
 /* @Output() close = new EventEmitter<void>();
  private fb = Inject(FormBuilder);
  form = this.fb.group({
    /!*
        email: ['', [Validators.required, Validators.email]],
    *!/
  });


  onSubmit() {
    /!*    if (this.form.valid) {
          const email = this.form.value.email;
          console.log('Отправка ссылки на email:', email);
          // тут можно вызывать сервис
          this.close.emit(); // закрытие по отправке
        } else {
          this.form.markAllAsTouched();
        }*!/
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close.emit();
    }
    /!*  private router = inject(ActivatedRoute);
      private resetPassword = inject(ResetPasswordService);*!/


    /!*
      ngOnInit() {
        this.route.queryParams
          .subscribe((params: any) => {
            this.token = params['token'];
          });
      }*!/

    /!*  onSubmit() {
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
      }*!/

    /!*  goToLoginPage() {
        this.router.navigate(['/login'], {queryParams: {resetPassword: 'success'}});
      }*!/
  }*/
}
