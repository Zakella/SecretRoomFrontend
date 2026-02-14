import {ChangeDetectionStrategy, Component, inject, model, output, signal} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DialogModule} from 'primeng/dialog';
import {ButtonModule} from 'primeng/button';
import {TranslocoPipe} from '@ngneat/transloco';
import {Authentication} from '../../../../@core/auth/authentication';
import {Language} from '../../../../@core/services/language';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule, DialogModule, ButtonModule, TranslocoPipe],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPassword {
  isVisible = model<boolean>(true);
  close = output<void>();
  form: FormGroup;
  submitting = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  private authService = inject(Authentication);
  private langService = inject(Language);

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
  }

  onClose() {
    this.close.emit();
    this.reset();
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const email = this.form.value.email;
    const lang = this.langService.currentLanguage();

    this.authService.restorePassword(email, lang).subscribe({
      next: () => {
        this.submitting.set(false);
        this.successMessage.set('forgotPassword.successMessage');
        this.form.reset();
      },
      error: () => {
        this.submitting.set(false);
        this.errorMessage.set('forgotPassword.errorMessage');
      }
    });
  }

  private reset(): void {
    this.form.reset();
    this.submitting.set(false);
    this.successMessage.set('');
    this.errorMessage.set('');
  }
}
