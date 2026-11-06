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
  Validators.pattern(/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/)
];

/**
 * Rules shared by checkout and the store hold form (SR-223); webstore checks the same ones.
 * Names: Latin letters only (no diacritics, no Cyrillic), space, hyphen, apostrophe.
 */
export const LATIN_NAME_PATTERN = /^[A-Za-z\s'-]+$/;
export const NAME_MIN_LENGTH = 2;
/** Moldovan mobile number: 9 digits starting with 06 or 07, no +373. */
export const MD_PHONE_PATTERN = /^0[67]\d{7}$/;
export const EMAIL_PATTERN = /^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/;
