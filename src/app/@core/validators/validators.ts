import { ValidatorFn, Validators } from '@angular/forms';

export const nameValidator: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(/^[\p{L}\s\-']+$/u)
];

export const passwordValidator: ValidatorFn[] = [
  Validators.required,
  Validators.minLength(8),
  Validators.pattern('^(?=.*[0-9])(?=.*[a-zA-Z])([a-zA-Z0-9]+)$')
];

export const emailValidator: ValidatorFn[] = [
  Validators.required,
  Validators.pattern(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)
];
