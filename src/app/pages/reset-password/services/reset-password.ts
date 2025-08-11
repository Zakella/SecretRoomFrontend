import {computed, inject, Injectable, signal} from '@angular/core';
import {Authentication} from '../../../@core/auth/authentication';
import {FormBuilder, ValidatorFn, Validators} from '@angular/forms';
import {passwordValidator} from '../../../@core/validators/validators';

@Injectable({
  providedIn: 'root'
})
export class ResetPasswordService {
  private authenticationService = inject(Authentication);
  public fb = inject(FormBuilder);
  form = computed(() => this.resetPasswordForm);
  error = signal<string | null>(null);




  resetPasswordForm = this.fb.group({
    password: ["", passwordValidator],
    passwordConfirmation: ["", Validators.required],
  });

}
