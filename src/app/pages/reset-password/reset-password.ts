import {Component, EventEmitter, Inject, inject, Output} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {ResetPasswordService} from './services/reset-password';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
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
  @Output() close = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<string>();

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

    // Имитация отправки запроса (замени на реальный вызов API)
    setTimeout(() => {
      this.submitting = false;
      this.successMessage = 'Если адрес электронной почты существует, на него отправлено письмо для сброса пароля.';
      this.submitted.emit(this.form.value.email);
      this.form.reset();
    }, 1500);
  }

  reset() {
    this.form.reset();
    this.submitting = false;
    this.successMessage = '';
    this.errorMessage = '';
  }
}
