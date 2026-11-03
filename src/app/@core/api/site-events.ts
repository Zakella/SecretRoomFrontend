import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {isPlatformBrowser} from '@angular/common';
import {EMPTY} from 'rxjs';
import {catchError} from 'rxjs/operators';
import {environment} from '../../../environments/environment';
import {CartItem} from '../../entities/cart-item';

export const SITE_EVENT_MAX_CART_LINES = 100;
const MAX_MESSAGE = 2000;
const MAX_NAME = 200;
const MAX_PHONE = 50;
const MAX_URL = 500;
const MAX_USER_AGENT = 500;

export interface SiteEventCartLine {
  appId: number | null;
  variantAppId: number | null;
  name: string | null;
  size: string | null;
  quantity: number;
  price: number | null;
}

/** Body of POST v1/site-events (SiteEventDto, see SR-206 contract). No card data here — ever. */
export interface SiteEvent {
  eventId: string;
  kind: 'CHECKOUT_ERROR';
  source: 'FRONTEND';
  step: 'ORDER_CREATE';
  errorCode: 'NETWORK' | 'SERVER_ERROR';
  message: string;
  occurredAt: string;
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string | null;
  amount?: number;
  language?: string;
  pageUrl?: string;
  userAgent?: string;
  cart?: SiteEventCartLine[];
}

export interface OrderCreateFailure {
  error: {status?: number; statusText?: string; error?: unknown};
  customerName?: string;
  customerPhone?: string;
  paymentMethod?: string | null;
  amount?: number;
  language?: string;
  cartItems: CartItem[];
}

const GATEWAY_STATUSES = [0, 502, 503, 504];

/**
 * Checkout errors the backend could not record itself: no response at all (status 0),
 * a gateway in front of it answered (502/503/504), or the response has no body.
 * 409/400/500 with a body are logged by the backend — reporting them again would duplicate.
 */
export function isUnrecordedOrderError(error: {status?: number; error?: unknown} | null | undefined): boolean {
  if (!error) return false;
  if (GATEWAY_STATUSES.includes(error.status ?? -1)) return true;
  const body = error.error;
  return body == null || body === '' || typeof body !== 'object';
}

function newEventId(): string {
  const c = (globalThis as {crypto?: Crypto}).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === 'function') {
    c.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cut(value: string | undefined | null, max: number): string | undefined {
  if (value == null) return undefined;
  return value.length > max ? value.slice(0, max) : value;
}

/** Fire-and-forget reports of site events to the admin (via WebStoreBackend). Browser only. */
@Injectable({providedIn: 'root'})
export class SiteEvents {
  private http = inject(HttpClient);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private url = environment.apiUrl + 'v1/site-events';

  /** Reports a failed POST v1/order when the backend could not have recorded it. */
  reportOrderCreateFailure(failure: OrderCreateFailure): void {
    if (!this.isBrowser || !isUnrecordedOrderError(failure.error)) return;
    try {
      const status = failure.error.status ?? 0;
      const event: SiteEvent = {
        eventId: newEventId(),
        kind: 'CHECKOUT_ERROR',
        source: 'FRONTEND',
        step: 'ORDER_CREATE',
        errorCode: status === 0 ? 'NETWORK' : 'SERVER_ERROR',
        message: cut(`${status} ${failure.error.statusText ?? ''}`.trim(), MAX_MESSAGE)!,
        occurredAt: new Date().toISOString(),
        customerName: cut(failure.customerName?.trim(), MAX_NAME),
        customerPhone: cut(failure.customerPhone?.trim(), MAX_PHONE),
        paymentMethod: failure.paymentMethod ?? null,
        amount: failure.amount,
        language: failure.language,
        pageUrl: cut(typeof location !== 'undefined' ? location.pathname : undefined, MAX_URL),
        userAgent: cut(typeof navigator !== 'undefined' ? navigator.userAgent : undefined, MAX_USER_AGENT),
        cart: failure.cartItems.slice(0, SITE_EVENT_MAX_CART_LINES).map(item => ({
          appId: toNumber(item.product?.id),
          variantAppId: toNumber(item.variantAppId),
          name: item.product?.name ?? null,
          size: item.size?.sizeType ?? null,
          quantity: item.quantity,
          price: toNumber(item.product?.price),
        })),
      };
      this.http.post(this.url, event).pipe(catchError(() => EMPTY)).subscribe();
    } catch {
      // reporting must never break checkout
    }
  }
}
