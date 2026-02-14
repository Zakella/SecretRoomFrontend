import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {Meta} from '@angular/platform-browser';
import {TranslocoPipe} from '@ngneat/transloco';
import {Router, RouterLink} from '@angular/router';
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
export class Login implements OnInit {
  private meta = inject(Meta);
  protected showResetPassword = signal<boolean>(false)
  private langService = inject(Language);
  private router = inject(Router);
  public loginService = inject(LoginService);
  public activeLang = this.langService.currentLanguage
  protected loginForm = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required])
  });

  showPassword = false;
  isSubmitting = signal(false);

  ngOnInit() {
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
  }

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
    setTimeout(() => this.isSubmitting.set(false), 2000);
  }

  showDialog() {
    this.showResetPassword.set(true);
  }

  switchLang(lang: 'ro' | 'ru') {
    this.langService.setLanguage(lang);
    this.router.navigate(['/', lang, 'login']);
  }
}
