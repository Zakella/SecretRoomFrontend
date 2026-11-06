import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpContext, HttpErrorResponse} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {SKIP_LOADER} from '../../@core/interceptors/loader-interceptor';
import {StoreCode} from '../../shared/data/stores';

/** SR-223: hold one size in a store for 24 h, webstore REST (contract docs/contracts/sr-223-store-hold.md). */

export const HOLD_NAME_MAX = 50;
export const HOLD_EMAIL_MAX = 100;

export type StoreHoldStatusCode =
  | 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'NOT_CONFIRMED' | 'PURCHASED' | 'NO_SHOW' | 'EXPIRED';

export const STORE_HOLD_STATUSES: readonly StoreHoldStatusCode[] =
  ['PENDING', 'CONFIRMED', 'REJECTED', 'NOT_CONFIRMED', 'PURCHASED', 'NO_SHOW', 'EXPIRED'];

export interface StoreHoldCreateBody {
  productId: number;
  /** null for a product without sizes: the hold is on the product itself. */
  variantAppId: number | null;
  storeCode: StoreCode;
  firstName: string;
  lastName: string;
  phone: string;
  email: string | null;
  language: string;
  /** Honeypot: always empty from a human. */
  website: string;
}

export interface StoreHoldStatus {
  number: string;
  status: StoreHoldStatusCode;
  storeCode: StoreCode;
  productId: number;
  variantAppId: number | null;
  productName: string | null;
  size: string | null;
  price: number | null;
  imageUrl: string | null;
  firstName: string | null;
  createdAt: string;
  confirmDeadline: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  reason: string | null;
}

/** Error code of a webstore error body `{ "error": "<CODE>" }`. */
export function storeHoldErrorCode(error: unknown): string {
  const body = (error as HttpErrorResponse | null)?.error as {error?: unknown} | null | undefined;
  return body && typeof body === 'object' && typeof body.error === 'string' ? body.error : '';
}

/**
 * The feature is off: 404 HOLD_DISABLED. Any other 404 except NOT_FOUND means the endpoint
 * does not exist on this webstore (site released before the backend) and is treated the same way.
 */
export function isHoldDisabled(error: unknown): boolean {
  return (error as HttpErrorResponse | null)?.status === 404 && storeHoldErrorCode(error) !== 'NOT_FOUND';
}

/** Translation key and params of the message shown for a failed request. */
export interface StoreHoldErrorText {
  key: string;
  params: Record<string, unknown>;
}

const CODE_KEYS: Record<string, string> = {
  BAD_NAME: 'storeHold.errors.badName',
  BAD_PHONE: 'storeHold.errors.badPhone',
  BAD_EMAIL: 'storeHold.errors.badEmail',
  BAD_STORE: 'storeHold.errors.badStore',
  OUT_OF_STOCK: 'storeHold.errors.outOfStock',
  SIZE_REQUIRED: 'storeHold.errors.sizeRequired',
  LIMIT_REACHED: 'storeHold.errors.limitReached',
  RATE_LIMIT: 'storeHold.errors.rateLimit',
  BOT: 'storeHold.errors.bot',
};

/**
 * What the shopper reads for a failed request. NOT_FOUND means "no such product" for create
 * and "no hold with this number and phone" for status.
 */
export function storeHoldErrorText(error: unknown, context: 'create' | 'status'): StoreHoldErrorText {
  const status = (error as HttpErrorResponse | null)?.status;
  const code = storeHoldErrorCode(error);
  if (isHoldDisabled(error)) return {key: 'storeHold.errors.disabled', params: {}};
  if (code === 'NOT_FOUND') {
    return {key: context === 'create' ? 'storeHold.errors.productNotFound' : 'storeHold.errors.holdNotFound', params: {}};
  }
  if (code === 'LIMIT_REACHED') {
    const max = (error as HttpErrorResponse).error?.max;
    return {key: CODE_KEYS[code], params: {max: typeof max === 'number' ? max : 2}};
  }
  if (CODE_KEYS[code]) return {key: CODE_KEYS[code], params: {}};
  if (status === 429) return {key: CODE_KEYS['RATE_LIMIT'], params: {}};
  if (status === 0) return {key: 'storeHold.errors.network', params: {}};
  return {key: 'storeHold.errors.generic', params: {}};
}

@Injectable({providedIn: 'root'})
export class StoreHoldApi {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + 'v1/store-holds';

  create(body: StoreHoldCreateBody): Observable<StoreHoldStatus> {
    return this.http.post<StoreHoldStatus>(this.apiUrl, body, this.options());
  }

  /** POST, not GET: the phone must not end up in the URL (nginx/Cloudflare logs). */
  status(number: string, phone: string): Observable<StoreHoldStatus> {
    return this.http.post<StoreHoldStatus>(`${this.apiUrl}/status`, {number, phone}, this.options());
  }

  /** No global loader: the dialog and the status page show their own progress. */
  private options() {
    return {context: new HttpContext().set(SKIP_LOADER, true)};
  }
}

/** Hold number as typed ("h17", " 17 ") to the API form "H17"; null when it is not a number. */
export function normalizeHoldNumber(value: string | null | undefined): string | null {
  const match = /^\s*[Hh]?\s*(\d{1,12})\s*$/.exec(value ?? '');
  return match ? `H${Number(match[1])}` : null;
}

/** Date and time in the stores' time zone (Europe/Chisinau), e.g. "07.11.2026, 10:30". */
export function formatChisinau(iso: string | null | undefined, lang: string): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(lang === 'ru' ? 'ru-RU' : 'ro-RO', {
    timeZone: 'Europe/Chisinau',
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}
