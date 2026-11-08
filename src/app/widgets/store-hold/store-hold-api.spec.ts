import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {
  formatChisinau, isHoldDisabled, normalizeHoldNumber, StoreHoldApi, StoreHoldCreateBody, storeHoldErrorText
} from './store-hold-api';
import {SKIP_LOADER} from '../../@core/interceptors/loader-interceptor';
import {environment} from '../../../environments/environment';

const BASE = environment.apiUrl + 'v1/store-holds';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({status, error});
}

describe('StoreHoldApi (SR-223)', () => {
  let api: StoreHoldApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    api = TestBed.inject(StoreHoldApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('create: POST /v1/store-holds with the body as is (empty honeypot), without the global loader', () => {
    const body: StoreHoldCreateBody = {
      productId: 123, variantAppId: 456, storeCode: 'atrium', firstName: 'Maria', lastName: 'Popescu',
      phone: '069123456', email: null, language: 'ro', website: '',
    };
    let number = '';
    api.create(body).subscribe(r => number = r.number);
    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    req.flush({number: 'H17', status: 'PENDING'}, {status: 201, statusText: 'Created'});
    expect(number).toBe('H17');
  });

  it('status: POST /v1/store-holds/status; the phone goes in the body, never in the URL', () => {
    api.status('H17', '069123456').subscribe();
    const req = http.expectOne(`${BASE}/status`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({number: 'H17', phone: '069123456'});
    expect(req.request.urlWithParams).not.toContain('069123456');
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    req.flush({number: 'H17', status: 'CONFIRMED'});
  });
});

describe('store hold errors (SR-223)', () => {
  const cases: [number, string, string][] = [
    [400, 'BAD_NAME', 'storeHold.errors.badName'],
    [400, 'BAD_PHONE', 'storeHold.errors.badPhone'],
    [400, 'BAD_EMAIL', 'storeHold.errors.badEmail'],
    [400, 'BAD_STORE', 'storeHold.errors.badStore'],
    [409, 'OUT_OF_STOCK', 'storeHold.errors.outOfStock'],
    [429, 'RATE_LIMIT', 'storeHold.errors.rateLimit'],
    [403, 'BOT', 'storeHold.errors.bot'],
    [404, 'HOLD_DISABLED', 'storeHold.errors.disabled'],
  ];
  for (const [status, code, key] of cases) {
    it(`${status} ${code} → ${key}`, () => {
      expect(storeHoldErrorText(httpError(status, {error: code}), 'create').key).toBe(key);
    });
  }

  it('NOT_FOUND means "no product" for create and "no such hold" for status', () => {
    const err = httpError(404, {error: 'NOT_FOUND'});
    expect(storeHoldErrorText(err, 'create').key).toBe('storeHold.errors.productNotFound');
    expect(storeHoldErrorText(err, 'status').key).toBe('storeHold.errors.holdNotFound');
  });

  it('LIMIT_REACHED carries the limit from the answer (2 by default)', () => {
    expect(storeHoldErrorText(httpError(409, {error: 'LIMIT_REACHED', max: 3}), 'create'))
      .toEqual({key: 'storeHold.errors.limitReached', params: {max: 3}});
    expect(storeHoldErrorText(httpError(409, {error: 'LIMIT_REACHED'}), 'create').params).toEqual({max: 2});
  });

  it('429 without a body is a rate limit, no connection is "network", the rest is generic', () => {
    expect(storeHoldErrorText(httpError(429), 'create').key).toBe('storeHold.errors.rateLimit');
    expect(storeHoldErrorText(httpError(0), 'create').key).toBe('storeHold.errors.network');
    expect(storeHoldErrorText(httpError(500), 'create').key).toBe('storeHold.errors.generic');
    expect(storeHoldErrorText(httpError(413), 'create').key).toBe('storeHold.errors.generic');
  });

  it('switched off: 404 HOLD_DISABLED or a 404 of a webstore without the endpoint, but not NOT_FOUND', () => {
    expect(isHoldDisabled(httpError(404, {error: 'HOLD_DISABLED'}))).toBeTrue();
    expect(isHoldDisabled(httpError(404, {error: 'Not Found', status: 404}))).toBeTrue();
    expect(isHoldDisabled(httpError(404, {error: 'NOT_FOUND'}))).toBeFalse();
    expect(isHoldDisabled(httpError(409, {error: 'OUT_OF_STOCK'}))).toBeFalse();
    expect(isHoldDisabled(httpError(500))).toBeFalse();
  });
});

describe('store hold helpers (SR-223)', () => {
  it('normalizeHoldNumber: "h17", " 17 ", "H 017" → "H17"; garbage → null', () => {
    expect(normalizeHoldNumber('h17')).toBe('H17');
    expect(normalizeHoldNumber(' 17 ')).toBe('H17');
    expect(normalizeHoldNumber('H 017')).toBe('H17');
    expect(normalizeHoldNumber('HX17')).toBeNull();
    expect(normalizeHoldNumber('')).toBeNull();
    expect(normalizeHoldNumber(null)).toBeNull();
  });

  it('formatChisinau shows the stores\' local time whatever the browser zone (winter UTC+2, summer UTC+3)', () => {
    expect(formatChisinau('2026-11-07T08:30:00Z', 'ro')).toContain('10:30');
    expect(formatChisinau('2026-11-07T08:30:00Z', 'ro')).toContain('07.11.2026');
    expect(formatChisinau('2026-07-01T07:00:00Z', 'ru')).toContain('10:00');
    expect(formatChisinau('2026-07-01T07:00:00Z', 'ru')).toContain('01.07.2026');
  });

  it('formatChisinau: no or bad date → empty string', () => {
    expect(formatChisinau(null, 'ro')).toBe('');
    expect(formatChisinau('not a date', 'ro')).toBe('');
  });
});
