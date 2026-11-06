import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PLATFORM_ID, signal} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {provideTransloco} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {environment} from '../../../environments/environment';
import {StoreHoldDialog} from './store-hold-dialog';
import {StoreHoldStatus} from './store-hold-api';
import {LAST_HOLD_KEY, StoreHoldRequest, StoreHoldState} from './store-hold-state';

const BASE = environment.apiUrl + 'v1/store-holds';
const REQUEST: StoreHoldRequest = {
  productId: 123, variantAppId: 456, productName: 'Bra Lace', size: '75B', price: 499, imageUrl: null,
};
const CREATED: StoreHoldStatus = {
  number: 'H17', status: 'PENDING', storeCode: 'eminescu', productId: 123, variantAppId: 456,
  productName: 'Bra Lace', size: '75B', price: 499, imageUrl: null, firstName: 'Maria',
  createdAt: '2026-11-07T08:00:00Z', confirmDeadline: '2026-11-07T09:00:00Z', confirmedAt: null, expiresAt: null,
  reason: null,
};

describe('StoreHoldDialog (SR-223)', () => {
  let fixture: ComponentFixture<StoreHoldDialog>;
  let http: HttpTestingController;
  let state: StoreHoldState;
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel);
  const qa = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
  const text = () => q('.sr-hold-dialog')?.textContent ?? '';

  function type(selector: string, value: string): void {
    const input = q<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  function fill(opts: {store?: string; first?: string; last?: string; phone?: string; email?: string} = {}): void {
    q<HTMLInputElement>(`#hold-store-${opts.store ?? 'eminescu'}`)!.click();
    type('#hold-first-name', opts.first ?? 'Maria');
    type('#hold-last-name', opts.last ?? 'Popescu');
    type('#hold-phone', opts.phone ?? '069123456');
    type('#hold-email', opts.email ?? '');
    fixture.detectChanges();
  }

  function submit(): void {
    q<HTMLButtonElement>('.sr-hold-dialog button[type="submit"]')!.click();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    localStorage.removeItem(LAST_HOLD_KEY);
    await TestBed.configureTestingModule({
      imports: [StoreHoldDialog],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideNoopAnimations(),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: PLATFORM_ID, useValue: 'browser'},
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
    state = TestBed.inject(StoreHoldState);
    fixture = TestBed.createComponent(StoreHoldDialog);
    fixture.detectChanges();
    state.open(REQUEST);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => {
    state.close();
    fixture.detectChanges();
    fixture.destroy();
    http.verify();
    localStorage.removeItem(LAST_HOLD_KEY);
  });

  it('shows the product, its size, three stores with address and hours, and the hint', () => {
    expect(text()).toContain('Bra Lace');
    expect(text()).toContain('75B');
    const stores = qa('.hold-store');
    expect(stores.length).toBe(3);
    expect(qa('.hold-store input').map(i => i.id)).toEqual(['hold-store-atrium', 'hold-store-eminescu', 'hold-store-secret-angel']);
    expect(stores[1].textContent).toContain('str. Eminescu 56');
    expect(stores[1].textContent).toContain('10:00 - 21:00');
    expect(text()).toContain('storeHold.hint');
  });

  it('empty form: nothing is sent, every required field says what is missing', () => {
    submit();
    http.expectNone(BASE);
    const errors = qa('.hold-error').map(e => e.textContent!.trim());
    expect(errors).toEqual(jasmine.arrayContaining([
      'storeHold.validation.store',
      'checkout.validation.name.required',
      'checkout.validation.lastname.required',
      'checkout.validation.phone.required',
    ]));
  });

  it('names in Cyrillic or with diacritics, a phone with +373 and a bad email are rejected before sending', () => {
    fill({first: 'Мария', last: 'Roșca', phone: '+37369123456', email: 'maria@'});
    submit();
    http.expectNone(BASE);
    const errors = qa('.hold-error').map(e => e.textContent!.trim());
    expect(errors).toEqual(jasmine.arrayContaining([
      'checkout.validation.name.pattern',
      'checkout.validation.lastname.pattern',
      'checkout.validation.phone.pattern',
      'checkout.validation.email.pattern',
    ]));
  });

  it('sends the hold and shows the number, "waiting for the store" and a link to the status page', () => {
    fill();
    submit();
    const req = http.expectOne(BASE);
    expect(req.request.body).toEqual({
      productId: 123, variantAppId: 456, storeCode: 'eminescu', firstName: 'Maria', lastName: 'Popescu',
      phone: '069123456', email: null, language: 'ru', website: '',
    });
    expect(q<HTMLButtonElement>('.sr-hold-dialog button[type="submit"]')!.disabled).toBeTrue();
    req.flush(CREATED, {status: 201, statusText: 'Created'});
    fixture.detectChanges();

    expect(text()).toContain('H17');
    expect(text()).toContain('storeHold.status.PENDING.title');
    expect(text()).toContain('str. Eminescu 56');
    const link = q<HTMLAnchorElement>('.hold-success a')!;
    expect(link.getAttribute('href')).toBe('/ru/store-hold?number=H17');
    expect(link.getAttribute('href')).not.toContain('069123456');
    expect(localStorage.getItem(LAST_HOLD_KEY)).toBe('H17');
  });

  it('optional email is sent trimmed', () => {
    fill({email: ' maria@mail.md '});
    submit();
    const req = http.expectOne(BASE);
    expect(req.request.body.email).toBe('maria@mail.md');
    req.flush(CREATED);
  });

  it('API error: the reason is shown and the form stays to fix it', () => {
    fill();
    submit();
    http.expectOne(BASE).flush({error: 'OUT_OF_STOCK'}, {status: 409, statusText: 'Conflict'});
    fixture.detectChanges();
    expect(q('[role="alert"]')!.textContent!.trim()).toBe('storeHold.errors.outOfStock');
    expect(q('#hold-phone')).not.toBeNull();
    expect(state.disabled()).toBeFalse();
  });

  it('LIMIT_REACHED and RATE_LIMIT are explained', () => {
    fill();
    submit();
    http.expectOne(BASE).flush({error: 'LIMIT_REACHED', max: 2}, {status: 409, statusText: 'Conflict'});
    fixture.detectChanges();
    expect(q('[role="alert"]')!.textContent!.trim()).toBe('storeHold.errors.limitReached');
    submit();
    http.expectOne(BASE).flush({error: 'RATE_LIMIT', retryAfterSeconds: 60}, {status: 429, statusText: 'Too Many'});
    fixture.detectChanges();
    expect(q('[role="alert"]')!.textContent!.trim()).toBe('storeHold.errors.rateLimit');
  });

  it('HOLD_DISABLED switches the hold off for the rest of the visit', () => {
    fill();
    submit();
    http.expectOne(BASE).flush({error: 'HOLD_DISABLED'}, {status: 404, statusText: 'Not Found'});
    fixture.detectChanges();
    expect(state.disabled()).toBeTrue();
    expect(q('[role="alert"]')!.textContent!.trim()).toBe('storeHold.errors.disabled');
    expect(q('.sr-hold-dialog button[type="submit"]')).toBeNull();
  });

  it('reopening for another product starts on the form again', () => {
    fill();
    submit();
    http.expectOne(BASE).flush(CREATED);
    fixture.detectChanges();
    state.open({...REQUEST, productName: 'Panty', size: 'M'});
    fixture.detectChanges();
    expect(q('.hold-success')).toBeNull();
    expect(text()).toContain('Panty');
    expect(q<HTMLInputElement>('#hold-phone')!.value).toBe('069123456');
  });
});
