import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, inject, PLATFORM_ID, signal
} from '@angular/core';
import {isPlatformBrowser, Location} from '@angular/common';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {FormBuilder, ReactiveFormsModule, Validators} from '@angular/forms';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Meta} from '@angular/platform-browser';
import {Subscription} from 'rxjs';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {MetaService} from '../../@core/services/meta.service';
import {Slugify} from '../../@core/services/slugify';
import {MD_PHONE_PATTERN} from '../../@core/validators/validators';
import {ProductPrice} from '../../shared/components/product/product-price/product-price';
import {Store, storeByCode} from '../../shared/data/stores';
import {
  formatChisinau, isHoldDisabled, normalizeHoldNumber, StoreHoldApi, StoreHoldErrorText, storeHoldErrorText,
  StoreHoldStatus
} from '../../widgets/store-hold/store-hold-api';
import {StoreHoldState} from '../../widgets/store-hold/store-hold-state';

/** Status text of a hold: translation keys and their params (times in Europe/Chisinau). */
export interface HoldStatusView {
  titleKey: string;
  textKey: string;
  params: Record<string, unknown>;
  tone: 'wait' | 'ok' | 'done' | 'closed';
}

export function holdStatusView(hold: StoreHoldStatus, lang: string): HoldStatusView {
  const base = `storeHold.status.${hold.status}`;
  switch (hold.status) {
    case 'PENDING':
      return hold.confirmDeadline
        ? {titleKey: `${base}.title`, textKey: `${base}.textUntil`, params: {time: formatChisinau(hold.confirmDeadline, lang)}, tone: 'wait'}
        : {titleKey: `${base}.title`, textKey: `${base}.text`, params: {}, tone: 'wait'};
    case 'CONFIRMED':
      return {titleKey: `${base}.title`, textKey: `${base}.text`, params: {time: formatChisinau(hold.expiresAt, lang)}, tone: 'ok'};
    case 'PURCHASED':
      return {titleKey: `${base}.title`, textKey: `${base}.text`, params: {}, tone: 'done'};
    case 'REJECTED':
    case 'NOT_CONFIRMED':
    case 'NO_SHOW':
    case 'EXPIRED':
      return {titleKey: `${base}.title`, textKey: `${base}.text`, params: {}, tone: 'closed'};
    default:
      return {titleKey: 'storeHold.status.unknown.title', textKey: 'storeHold.status.unknown.text', params: {}, tone: 'wait'};
  }
}

/** /:lang/store-hold — status of a store hold by its number and phone (SR-223). */
@Component({
  selector: 'app-store-hold-page',
  imports: [ReactiveFormsModule, TranslocoPipe, RouterLink, ProductPrice],
  templateUrl: './store-hold-page.html',
  styleUrl: './store-hold-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreHoldPage {
  private readonly api = inject(StoreHoldApi);
  private readonly holdState = inject(StoreHoldState);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly slugify = inject(Slugify);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly lang = inject(Language).currentLanguage;

  protected readonly form = inject(FormBuilder).nonNullable.group({
    number: ['', [Validators.required, Validators.pattern(/^\s*[Hh]?\s*\d{1,12}\s*$/)]],
    phone: ['', [Validators.required, Validators.pattern(MD_PHONE_PATTERN)]],
  });

  protected readonly loading = signal(false);
  protected readonly hold = signal<StoreHoldStatus | null>(null);
  protected readonly error = signal<StoreHoldErrorText | null>(null);
  /** Number and phone of the shown hold, for "Refresh". */
  private query: {number: string; phone: string} | null = null;
  private sub?: Subscription;

  protected readonly view = computed(() => {
    const hold = this.hold();
    return hold ? holdStatusView(hold, this.lang()) : null;
  });
  protected readonly store = computed<Store | undefined>(() => storeByCode(this.hold()?.storeCode));
  protected readonly productLink = computed(() => {
    const hold = this.hold();
    return hold?.productId ? this.slugify.productUrl(this.lang(), String(hold.productId), hold.productName ?? '') : null;
  });

  constructor() {
    const meta = inject(Meta);
    const metaService = inject(MetaService);
    metaService.updateTitle(this.lang() === 'ru' ? 'Отложенный товар | Secret Room' : 'Produs rezervat | Secret Room');
    // Personal page: nothing to index.
    meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
    this.destroyRef.onDestroy(() => meta.removeTag("name='robots'"));

    const number = this.route.snapshot.queryParamMap.get('number');
    this.form.controls.number.setValue(number ?? '');

    // Status requests only in the browser: the phone (router state) and localStorage do not exist on the server.
    const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
    afterNextRender(() => {
      if (!isBrowser) return;
      if (!number) {
        const last = this.holdState.lastNumber();
        if (last) this.form.controls.number.setValue(last);
      }
      const phone = (this.location.getState() as {phone?: unknown} | null)?.phone;
      if (typeof phone === 'string' && phone) {
        this.form.controls.phone.setValue(phone);
        if (this.form.valid) this.submit();
      }
    });
  }

  protected numberError(): string | null {
    const c = this.form.controls.number;
    if (!c.touched || !c.errors) return null;
    return c.errors['required'] ? 'storeHold.validation.numberRequired' : 'storeHold.validation.numberPattern';
  }

  protected phoneError(): string | null {
    const c = this.form.controls.phone;
    if (!c.touched || !c.errors) return null;
    return c.errors['required'] ? 'checkout.validation.phone.required' : 'checkout.validation.phone.pattern';
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.load({number: normalizeHoldNumber(value.number)!, phone: value.phone.trim()});
  }

  protected refresh(): void {
    if (this.query) this.load(this.query);
  }

  protected formatTime(iso: string | null | undefined): string {
    return formatChisinau(iso, this.lang());
  }

  private load(query: {number: string; phone: string}): void {
    this.sub?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);
    this.sub = this.api.status(query.number, query.phone).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: hold => {
        this.loading.set(false);
        this.query = query;
        this.hold.set(hold);
        this.holdState.saveLastNumber(hold.number);
        // Keep the number in the address (bookmark, mail link); the phone never goes there.
        if (this.route.snapshot.queryParamMap.get('number') !== hold.number) {
          this.router.navigate([], {relativeTo: this.route, queryParams: {number: hold.number}, replaceUrl: true});
        }
      },
      error: err => {
        this.loading.set(false);
        if (isHoldDisabled(err)) this.holdState.markDisabled();
        this.hold.set(null);
        this.query = null;
        this.error.set(storeHoldErrorText(err, 'status'));
      },
    });
  }
}
