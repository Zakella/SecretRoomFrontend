import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';
import {RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {FadeUp} from '../../@core/directives/fade-up';
import {ResetPassword} from '../../shared/components/modals/reset-password/reset-password';
import {LoginService} from './services/login';

@Component({
  selector: 'app-login',
  imports: [
    ResetPassword,
    FormsModule,
    TranslocoPipe,
    RouterLink,
    FadeUp,
    ReactiveFormsModule
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  protected showResetPassword = signal<boolean>(false)
  private langService = inject(Language);
  private loginService = inject(LoginService);
  public activeLang = this.langService.currentLanguage
  protected loginForm = new FormGroup({
    email: new FormControl(''),
    password: new FormControl('')
  });

  submit() {
    if (!this.loginForm.valid) return;
    this.loginService.login(this.loginForm.value);
  }


  onResetPasswordSubmitted(event: any) {
  }


  showDialog() {
    this.showResetPassword.set(true);
  }
}
