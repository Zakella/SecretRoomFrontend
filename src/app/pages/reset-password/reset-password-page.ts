import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {Authentication} from '../../@core/auth/authentication';
import {Language} from '../../@core/services/language';
import {passwordValidator} from '../../@core/validators/validators';

@Component({
  selector: 'app-reset-password-page',
  imports: [ReactiveFormsModule, TranslocoPipe, RouterLink],
  templateUrl: './reset-password-page.html',
  styleUrl: './reset-password-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPasswordPage implements OnInit {
  form: FormGroup;
  token = '';
  submitting = signal(false);
  success = signal(false);
  errorMessage = signal('');
  showPassword = false;
  showConfirmPassword = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(Authentication);
  private langService = inject(Language);

  activeLang = this.langService.currentLanguage;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      password: ['', passwordValidator],
      passwordConfirmation: ['', [Validators.required]],
    }, {validators: this.passwordsMatch});
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage.set('resetPassword.invalidToken');
    }
  }

  passwordsMatch(group: FormGroup): {[key: string]: boolean} | null {
    const password = group.get('password')?.value;
    const confirm = group.get('passwordConfirmation')?.value;
    if (password && confirm && password !== confirm) {
      return {passwordsMismatch: true};
    }
    return null;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  hasValue(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.value && field.value.length > 0);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set('');

    this.authService.resetPassword(this.token, this.form.value.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.success.set(true);
      },
      error: (err) => {
        this.submitting.set(false);
        if (err.status === 410 || err.status === 404) {
          this.errorMessage.set('resetPassword.tokenExpired');
        } else {
          this.errorMessage.set('resetPassword.error');
        }
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/', this.activeLang(), 'login']);
  }

  switchLang(lang: 'ro' | 'ru') {
    this.langService.setLanguage(lang);
  }
}
