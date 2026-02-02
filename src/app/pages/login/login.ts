import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';
import {RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {ResetPassword} from '../../shared/components/modals/reset-password/reset-password';
import {LoginService} from './services/login';

@Component({
  selector: 'app-login',
  imports: [
    ResetPassword,
    FormsModule,
    TranslocoPipe,
    RouterLink,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  protected showResetPassword = signal<boolean>(false)
  private langService = inject(Language);
  public loginService = inject(LoginService);
  public activeLang = this.langService.currentLanguage
  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  showPassword = false;
  isSubmitting = signal(false);

  isFieldInvalid(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  hasValue(fieldName: string): boolean {
    const field = this.loginForm.get(fieldName);
    return !!(field && field.value && field.value.length > 0);
  }

  submit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.loginService.login(this.loginForm.value);

    // Reset submitting state after a delay (in real app, this would be in the service callback)
    setTimeout(() => this.isSubmitting.set(false), 2000);
  }


  onResetPasswordSubmitted(event: any) {
  }


  showDialog() {
    this.showResetPassword.set(true);
  }
}
