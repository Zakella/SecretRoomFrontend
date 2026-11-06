import {ChangeDetectionStrategy, Component, DestroyRef, effect, inject, signal, untracked} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {RouterLink} from '@angular/router';
import {DialogModule} from 'primeng/dialog';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {EMAIL_PATTERN, LATIN_NAME_PATTERN, MD_PHONE_PATTERN, NAME_MIN_LENGTH} from '../../@core/validators/validators';
import {ProductPrice} from '../../shared/components/product/product-price/product-price';
import {Store, STORES, storeByCode, StoreCode} from '../../shared/data/stores';
import {
  formatChisinau, HOLD_EMAIL_MAX, HOLD_NAME_MAX, isHoldDisabled, StoreHoldApi, StoreHoldErrorText,
  storeHoldErrorText, StoreHoldStatus
} from './store-hold-api';
import {StoreHoldRequest, StoreHoldState} from './store-hold-state';

export type HoldField = 'storeCode' | 'firstName' | 'lastName' | 'phone' | 'email';

/** Order in which a control's errors are reported: the first one present wins. */
const RULE_ORDER = ['required', 'pattern', 'minlength', 'maxlength'] as const;

/**
 * Messages per field and rule. Names, phone and email reuse the checkout texts:
 * the rules are the same (webstore checks them as in checkout).
 */
export const HOLD_ERROR_KEYS: Record<HoldField, Partial<Record<typeof RULE_ORDER[number], string>>> = {
  storeCode: {required: 'storeHold.validation.store'},
  firstName: {
    required: 'checkout.validation.name.required',
    pattern: 'checkout.validation.name.pattern',
    minlength: 'checkout.validation.name.minlength',
    maxlength: 'storeHold.validation.nameMax',
  },
  lastName: {
    required: 'checkout.validation.lastname.required',
    pattern: 'checkout.validation.lastname.pattern',
    minlength: 'checkout.validation.lastname.minlength',
    maxlength: 'storeHold.validation.nameMax',
  },
  phone: {required: 'checkout.validation.phone.required', pattern: 'checkout.validation.phone.pattern'},
  email: {pattern: 'checkout.validation.email.pattern', maxlength: 'storeHold.validation.emailMax'},
};

/** "Hold in store" dialog (SR-223). Mounted once in the main layout, opened through StoreHoldState. */
@Component({
  selector: 'app-store-hold-dialog',
  imports: [ReactiveFormsModule, DialogModule, TranslocoPipe, RouterLink, ProductPrice],
  templateUrl: './store-hold-dialog.html',
  styleUrl: './store-hold-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreHoldDialog {
  protected readonly state = inject(StoreHoldState);
  private readonly api = inject(StoreHoldApi);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly lang = inject(Language).currentLanguage;
  protected readonly stores: readonly Store[] = STORES;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    storeCode: ['' as StoreCode | '', Validators.required],
    firstName: ['', [Validators.required, Validators.minLength(NAME_MIN_LENGTH), Validators.maxLength(HOLD_NAME_MAX),
      Validators.pattern(LATIN_NAME_PATTERN)]],
    lastName: ['', [Validators.required, Validators.minLength(NAME_MIN_LENGTH), Validators.maxLength(HOLD_NAME_MAX),
      Validators.pattern(LATIN_NAME_PATTERN)]],
    phone: ['', [Validators.required, Validators.pattern(MD_PHONE_PATTERN)]],
    email: ['', [Validators.maxLength(HOLD_EMAIL_MAX), Validators.pattern(EMAIL_PATTERN)]],
    /** Honeypot, hidden from people. */
    website: [''],
  });

  protected readonly submitting = signal(false);
  protected readonly error = signal<StoreHoldErrorText | null>(null);
  /** Created hold; the form is replaced by the confirmation. */
  protected readonly result = signal<StoreHoldStatus | null>(null);
  /** Phone of the created hold: handed to the status page in router state, never in the URL. */
  protected readonly resultPhone = signal('');

  constructor() {
    // Each opening starts on the form; the shopper's name and phone are kept for the next product.
    effect(() => {
      const request = this.state.request();
      if (!request) return;
      untracked(() => {
        this.result.set(null);
        this.error.set(null);
        this.submitting.set(false);
        this.form.controls.website.setValue('');
        this.form.markAsUntouched();
      });
    });
  }

  protected store(code: string | null | undefined): Store | undefined {
    return storeByCode(code);
  }

  /** First violated rule of the field, shown once it was touched. */
  protected fieldError(field: HoldField): {key: string; params: Record<string, unknown>} | null {
    const control = this.form.controls[field];
    if (!control.touched || !control.errors) return null;
    const errors = control.errors;
    const rule = RULE_ORDER.find(r => errors[r]);
    const key = rule ? HOLD_ERROR_KEYS[field][rule] : undefined;
    if (!rule || !key) return null;
    const params: Record<string, unknown> = {};
    if (errors['minlength']) params['min'] = errors['minlength'].requiredLength;
    if (errors['maxlength']) params['max'] = errors['maxlength'].requiredLength;
    return {key, params};
  }

  protected formatTime(iso: string | null | undefined): string {
    return formatChisinau(iso, this.lang());
  }

  protected submit(request: StoreHoldRequest): void {
    if (this.submitting()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const email = value.email.trim();
    this.submitting.set(true);
    this.error.set(null);
    this.api.create({
      productId: request.productId,
      variantAppId: request.variantAppId,
      storeCode: value.storeCode as StoreCode,
      firstName: value.firstName.trim(),
      lastName: value.lastName.trim(),
      phone: value.phone.trim(),
      email: email || null,
      language: this.lang() === 'ru' ? 'ru' : 'ro',
      website: value.website,
    }).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: hold => {
        this.submitting.set(false);
        this.resultPhone.set(value.phone.trim());
        this.result.set(hold);
        this.state.saveLastNumber(hold.number);
      },
      error: err => {
        this.submitting.set(false);
        if (isHoldDisabled(err)) this.state.markDisabled();
        this.error.set(storeHoldErrorText(err, 'create'));
      },
    });
  }

  protected close(): void {
    this.state.close();
  }
}
