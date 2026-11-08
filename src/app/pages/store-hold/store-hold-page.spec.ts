import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PLATFORM_ID, signal} from '@angular/core';
import {Location} from '@angular/common';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, convertToParamMap, provideRouter, Router} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {MetaService} from '../../@core/services/meta.service';
import {environment} from '../../../environments/environment';
import {StoreHoldStatus, STORE_HOLD_STATUSES} from '../../widgets/store-hold/store-hold-api';
import {LAST_HOLD_KEY} from '../../widgets/store-hold/store-hold-state';
import {holdStatusView, StoreHoldPage} from './store-hold-page';

const STATUS_URL = environment.apiUrl + 'v1/store-holds/status';

function hold(patch: Partial<StoreHoldStatus> = {}): StoreHoldStatus {
  return {
    number: 'H17', status: 'PENDING', storeCode: 'atrium', productId: 123, variantAppId: 456,
    productName: 'Bra Lace', size: '75B', price: 499, imageUrl: null, firstName: 'Maria',
    createdAt: '2026-11-07T08:00:00Z', confirmDeadline: '2026-11-07T09:00:00Z', confirmedAt: null, expiresAt: null,
    reason: null, ...patch,
  };
}

describe('holdStatusView (SR-223)', () => {
  it('has a human text for each of the 7 statuses', () => {
    for (const status of STORE_HOLD_STATUSES) {
      const v = holdStatusView(hold({status}), 'ro');
      expect(v.titleKey).withContext(status).toBe(`storeHold.status.${status}.title`);
      expect(v.textKey.startsWith(`storeHold.status.${status}.`)).withContext(status).toBeTrue();
    }
  });

  it('PENDING shows the confirmation deadline in Chisinau time; without it — the general rule', () => {
    expect(holdStatusView(hold(), 'ro')).toEqual(jasmine.objectContaining({
      textKey: 'storeHold.status.PENDING.textUntil', tone: 'wait',
    }));
    expect(holdStatusView(hold(), 'ro').params['time']).toContain('11:00');
    expect(holdStatusView(hold({confirmDeadline: null}), 'ro').textKey).toBe('storeHold.status.PENDING.text');
  });

  it('CONFIRMED: "held until <date time>"', () => {
    const v = holdStatusView(hold({status: 'CONFIRMED', expiresAt: '2026-11-08T08:30:00Z'}), 'ru');
    expect(v.tone).toBe('ok');
    expect(v.params['time']).toContain('08.11.2026');
    expect(v.params['time']).toContain('10:30');
  });

  it('closed statuses are muted, purchase is done', () => {
    for (const status of ['REJECTED', 'NOT_CONFIRMED', 'NO_SHOW', 'EXPIRED'] as const) {
      expect(holdStatusView(hold({status}), 'ro').tone).withContext(status).toBe('closed');
    }
    expect(holdStatusView(hold({status: 'PURCHASED'}), 'ro').tone).toBe('done');
  });

  it('an unknown status does not break the page', () => {
    expect(holdStatusView(hold({status: 'WHATEVER' as never}), 'ro').titleKey).toBe('storeHold.status.unknown.title');
  });
});

describe('StoreHoldPage (SR-223)', () => {
  let fixture: ComponentFixture<StoreHoldPage>;
  let http: HttpTestingController;
  let navigate: jasmine.Spy;
  const el = () => fixture.nativeElement as HTMLElement;

  function setup(opts: {number?: string | null; phone?: string; platform?: 'browser' | 'server'} = {}) {
    TestBed.configureTestingModule({
      imports: [StoreHoldPage],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: PLATFORM_ID, useValue: opts.platform ?? 'browser'},
        {provide: MetaService, useValue: jasmine.createSpyObj('MetaService', ['updateTitle'])},
        {
          provide: ActivatedRoute,
          useValue: {snapshot: {queryParamMap: convertToParamMap(opts.number ? {number: opts.number} : {})}},
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    spyOn(TestBed.inject(Location), 'getState').and.returnValue(opts.phone ? {phone: opts.phone} : {});
    fixture = TestBed.createComponent(StoreHoldPage);
    fixture.detectChanges();
  }

  function type(selector: string, value: string) {
    const input = el().querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  const submit = () => {
    el().querySelector<HTMLButtonElement>('.hold-lookup button[type="submit"]')!.click();
    fixture.detectChanges();
  };

  afterEach(() => {
    http.verify();
    localStorage.removeItem(LAST_HOLD_KEY);
  });

  it('with the number in the URL and the phone from the dialog (router state) loads the status by itself', () => {
    setup({number: 'H17', phone: '069123456'});
    const req = http.expectOne(STATUS_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({number: 'H17', phone: '069123456'});
    req.flush(hold());
    fixture.detectChanges();
    const card = el().querySelector('.hold-card')!;
    expect(card.textContent).toContain('H17');
    expect(card.textContent).toContain('Bra Lace');
    expect(card.textContent).toContain('75B');
    expect(card.textContent).toContain('Atrium, et. 1');
    expect(card.textContent).toContain('storeHold.status.PENDING.title');
    expect(card.textContent).toContain('storeHold.status.PENDING.textUntil');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('on the server nothing is requested, the number from the URL is in the form', () => {
    setup({number: 'H17', phone: '069123456', platform: 'server'});
    http.expectNone(STATUS_URL);
    expect(el().querySelector<HTMLInputElement>('#hold-number')!.value).toBe('H17');
  });

  it('without the phone the shopper types it; the number is normalized ("h 17" → "H17") and put into the URL', () => {
    setup({});
    type('#hold-number', 'h 17');
    type('#hold-lookup-phone', '069123456');
    submit();
    const req = http.expectOne(STATUS_URL);
    expect(req.request.body).toEqual({number: 'H17', phone: '069123456'});
    req.flush(hold({status: 'CONFIRMED', expiresAt: '2026-11-08T08:30:00Z'}));
    fixture.detectChanges();
    expect(el().querySelector('.hold-card__status')!.getAttribute('data-tone')).toBe('ok');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({queryParams: {number: 'H17'}, replaceUrl: true}));
    expect(JSON.stringify(navigate.calls.mostRecent().args)).not.toContain('069123456');
    expect(localStorage.getItem(LAST_HOLD_KEY)).toBe('H17');
  });

  it('a bad number or phone is not sent', () => {
    setup({});
    type('#hold-number', 'abc');
    type('#hold-lookup-phone', '+37369123456');
    submit();
    http.expectNone(STATUS_URL);
    const errors = Array.from(el().querySelectorAll('.hold-error')).map(e => e.textContent!.trim());
    expect(errors).toEqual(['storeHold.validation.numberPattern', 'checkout.validation.phone.pattern']);
  });

  it('wrong number or phone: one message, no hint which of them', () => {
    setup({number: 'H17', phone: '069000000'});
    http.expectOne(STATUS_URL).flush({error: 'NOT_FOUND'}, {status: 404, statusText: 'Not Found'});
    fixture.detectChanges();
    expect(el().querySelector('[role="alert"]')!.textContent!.trim()).toBe('storeHold.errors.holdNotFound');
    expect(el().querySelector('.hold-card')).toBeNull();
  });

  it('"Refresh" asks again with the same number and phone', () => {
    setup({number: 'H17', phone: '069123456'});
    http.expectOne(STATUS_URL).flush(hold());
    fixture.detectChanges();
    el().querySelector<HTMLButtonElement>('.hold-card .hold-btn--ghost')!.click();
    const req = http.expectOne(STATUS_URL);
    expect(req.request.body).toEqual({number: 'H17', phone: '069123456'});
    req.flush(hold({status: 'REJECTED', reason: 'NOT_IN_STORE'}));
    fixture.detectChanges();
    expect(el().querySelector('.hold-card')!.textContent).toContain('storeHold.status.REJECTED.title');
  });

  it('without a number in the URL the last hold number from this browser is offered', () => {
    localStorage.setItem(LAST_HOLD_KEY, 'H21');
    setup({});
    expect(el().querySelector<HTMLInputElement>('#hold-number')!.value).toBe('H21');
    http.expectNone(STATUS_URL);
  });
});
