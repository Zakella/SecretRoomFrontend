import {ChangeDetectionStrategy, Component, output} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';

@Component({
  selector: 'app-reset-password',
  imports: [ReactiveFormsModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ResetPassword {
  close = output<void>();
  submitted = output<string>();
  form: FormGroup;
  submitting = false;
  successMessage = '';
  errorMessage = '';

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
    this.submitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    setTimeout(() => {
      this.submitting = false;
      this.successMessage = 'Если адрес электронной почты существует, на него отправлено письмо для сброса пароля.';
      this.submitted.emit(this.form.value.email);
      this.form.reset();
    }, 1500);
  }

  private reset(): void {
    this.form.reset();
    this.submitting = false;
    this.successMessage = '';
    this.errorMessage = '';
  }
}
