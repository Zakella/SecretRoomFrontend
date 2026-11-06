import {inject, Injectable, InjectionToken, NgZone, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {NavigationEnd, Router} from '@angular/router';
import {environment} from '../../../environments/environment';
import {CartItem} from '../../entities/cart-item';

/** SR-207: anonymous journal of visitor actions (contract sr-207-visitor-journal-contract.md). */

export const VISITOR_ID_KEY = 'sr_visitor_id';
export const COOKIE_CONSENT_KEY = 'cookie_consent';
const VISIT_STARTED_KEY = 'sr_visit_started';
const CUSTOMER_LINKED_KEY = 'sr_customer_linked';
const ORDER_LINKED_KEY = 'sr_order_linked';
const ORDER_LINKED_KEEP = 20;

export const TRACKER_BATCH_MAX = 50;
export const TRACKER_FLUSH_AT = 20;
export const TRACKER_FLUSH_MS = 10_000;

const BOT_UA = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse/i;

export type VisitorAction =
  | 'VISIT_START' | 'PAGE_VIEW' | 'ADD_TO_CART' | 'REMOVE_FROM_CART'
  | 'CHECKOUT_OPEN' | 'CHECKOUT_SUBMIT' | 'CHECKOUT_SUCCESS' | 'CHECKOUT_FAIL'
  | 'CLICK' | 'ORDER_LINK' | 'CUSTOMER_LINK';

export type PageType =
  | 'HOME' | 'CATALOG' | 'PRODUCT' | 'SEARCH' | 'CART' | 'CHECKOUT'
  | 'ORDER_SUMMARY' | 'ACCOUNT' | 'FAVORITES' | 'OTHER';

export type TrackButton = 'ADD_TO_CART' | 'CHECKOUT' | 'PAY' | 'FAVORITE' | 'SHOP_PHONE' | 'MESSENGER';

export interface VisitorCartLine {
  appId: number | null;
  variantAppId: number | null;
  name: string | null;
  size: string | null;
  quantity: number;
  price: number | null;
}

export interface VisitorEvent {
  eventId: string;
  action: VisitorAction;
  occurredAt: string;
  pageType?: PageType;
  pageUrl?: string;
  searchQuery?: string;
  button?: TrackButton;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  device?: 'MOBILE' | 'TABLET' | 'DESKTOP';
  customerRef?: string;
  customerName?: string;
  customerPhone?: string;
  orderId?: number;
  orderTrackingNumber?: string;
  amount?: number;
  paymentMethod?: string;
  errorCode?: string;
  message?: string;
  cart?: VisitorCartLine[];
}

export interface VisitorBatch {
  visitorId: string;
  language?: string;
  events: VisitorEvent[];
}

/** Client-side cuts, same as the webstore cuts (contract tables). */
const LIMITS: Partial<Record<keyof VisitorEvent, number>> = {
  action: 50, pageType: 30, pageUrl: 500, searchQuery: 200, button: 50, referrer: 500,
  utmSource: 100, utmMedium: 100, utmCampaign: 100, device: 20, customerRef: 100,
  customerName: 200, customerPhone: 50, orderTrackingNumber: 100, paymentMethod: 50,
  errorCode: 50, message: 300,
};
const MAX_CART_NAME = 200;
const MAX_CART_SIZE = 50;

/** What the tracker reads from the browser; replaced in tests. */
export interface TrackerNavigator {
  userAgent?: string;
  webdriver?: boolean;
  sendBeacon?: (url: string, data?: BodyInit | null) => boolean;
}

export const TRACKER_NAVIGATOR = new InjectionToken<TrackerNavigator | undefined>('TRACKER_NAVIGATOR', {
  providedIn: 'root',
  factory: () => (typeof navigator !== 'undefined' ? navigator : undefined),
});

export const TRACKER_ENABLED = new InjectionToken<boolean>('TRACKER_ENABLED', {
  providedIn: 'root',
  factory: () => environment.visitorTracking === true,
});

export function newUuid(): string {
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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function stripQuery(url: string): string {
  return url.split('#')[0].split('?')[0];
}

/** Page type by the router URL (/:lang/...), see app.routes.ts. */
export function pageTypeOf(url: string): PageType {
  const segments = stripQuery(url ?? '').split('/').filter(Boolean);
  if (segments.length === 0) return 'HOME';
  if (segments[0] !== 'ro' && segments[0] !== 'ru') return 'OTHER';
  const [, first] = segments;
  switch (first) {
    case undefined: return 'HOME';
    case 'catalog':
    case 'brands': return 'CATALOG';
    case 'product': return 'PRODUCT';
    case 'search': return 'SEARCH';
    case 'cart': return 'CART';
    case 'checkout': return 'CHECKOUT';
    case 'order-success': return 'ORDER_SUMMARY';
    case 'cabinet':
    case 'order': return 'ACCOUNT';
    case 'favorites': return 'FAVORITES';
    default: return 'OTHER';
  }
}

/** Search text from /:lang/search/:query. */
export function searchQueryOf(url: string): string | undefined {
  const segments = stripQuery(url ?? '').split('/').filter(Boolean);
  if (segments[1] !== 'search' || !segments[2]) return undefined;
  try {
    return decodeURIComponent(segments[2]);
  } catch {
    return segments[2];
  }
}

export function cutEvent(event: VisitorEvent): VisitorEvent {
  const out = {...event} as unknown as Record<string, unknown>;
  for (const [key, max] of Object.entries(LIMITS)) {
    const v = out[key];
    if (typeof v === 'string' && v.length > max!) out[key] = v.slice(0, max);
  }
  if (event.cart) {
    out['cart'] = event.cart.map(line => ({
      ...line,
      name: line.name != null ? line.name.slice(0, MAX_CART_NAME) : null,
      size: line.size != null ? line.size.slice(0, MAX_CART_SIZE) : null,
    }));
  }
  return out as unknown as VisitorEvent;
}

function toNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function cartLine(item: CartItem): VisitorCartLine {
  return {
    appId: toNumber(item.product?.id),
    variantAppId: toNumber(item.variantAppId),
    name: item.product?.name ?? null,
    size: item.size?.sizeType ?? null,
    quantity: item.quantity,
    price: toNumber(item.product?.price),
  };
}

function nonEmpty(v: string | null | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}

/** Short machine code of a failed POST v1/order (SR-206 codes). */
export function checkoutFailCode(error: {status?: number; error?: unknown} | null | undefined): string {
  const status = error?.status;
  const body = error?.error as {error?: unknown} | null | undefined;
  const code = body && typeof body === 'object' && typeof body.error === 'string' ? body.error : '';
  if (code === 'OUT_OF_STOCK' || code === 'PRODUCT_UNAVAILABLE') return code;
  if (status === 0) return 'NETWORK';
  if (status === 400 || status === 422) return 'VALIDATION';
  if (status != null && status >= 500) return 'SERVER_ERROR';
  return 'UNEXPECTED';
}

/** Bots, headless browsers and automation (navigator.webdriver); no navigator at all counts as a bot. */
export function isBotNavigator(nav: TrackerNavigator | undefined | null): boolean {
  if (!nav) return true;
  if (nav.webdriver) return true;
  return BOT_UA.test(nav.userAgent ?? '');
}

/** Device class by the user agent, then by the viewport width. */
export function deviceOf(nav: TrackerNavigator | undefined | null): 'MOBILE' | 'TABLET' | 'DESKTOP' {
  const ua = nav?.userAgent ?? '';
  if (/ipad|tablet/i.test(ua)) return 'TABLET';
  if (/mobi|iphone|android/i.test(ua)) return 'MOBILE';
  const width = typeof window !== 'undefined' ? window.innerWidth : 0;
  if (width > 0 && width < 768) return 'MOBILE';
  if (width > 0 && width < 1024) return 'TABLET';
  return 'DESKTOP';
}

/** Site language ro/ru: the /:lang/ path segment, then <html lang>. */
export function siteLanguageOf(path: string): string | undefined {
  const seg = path.split('/')[1];
  if (seg === 'ro' || seg === 'ru') return seg;
  const lang = typeof document !== 'undefined' ? document.documentElement?.lang : '';
  return lang === 'ro' || lang === 'ru' ? lang : undefined;
}

/** sendBeacon (text/plain, no CORS preflight), fallback fetch keepalive; never throws, failures are lost. */
export function postBeacon(nav: TrackerNavigator | undefined | null, url: string, json: string): void {
  let sent = false;
  try {
    if (nav && typeof nav.sendBeacon === 'function') {
      sent = nav.sendBeacon(url, new Blob([json], {type: 'text/plain;charset=UTF-8'})) === true;
    }
  } catch {
    sent = false;
  }
  if (sent) return;
  try {
    if (typeof fetch !== 'function') return;
    fetch(url, {
      method: 'POST',
      body: json,
      keepalive: true,
      credentials: 'omit',
      headers: {'Content-Type': 'text/plain;charset=UTF-8'},
    }).catch(() => undefined);
  } catch {
    // lost — acceptable
  }
}

/**
 * Fire-and-forget journal of visitor actions → POST v1/site-events/visitor (sendBeacon).
 * Works only in the browser, with cookie consent, not for bots, with environment.visitorTracking.
 * Never throws and never logs: a broken tracker must not affect the site.
 */
@Injectable({providedIn: 'root'})
export class SiteTracker {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly enabled = inject(TRACKER_ENABLED);
  private readonly nav = inject(TRACKER_NAVIGATOR);
  private readonly zone = inject(NgZone);
  private readonly router = inject(Router);
  private readonly url = environment.apiUrl + 'v1/site-events/visitor';

  private consent: boolean | null = null;
  private buffer: VisitorEvent[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;
  private listening = false;
  private initialized = false;
  private lastUrl: string | null = null;

  /** Called once from App: follows navigation. Cheap: work happens in idle time, outside the zone. */
  init(): void {
    if (!this.isBrowser || !this.enabled || this.initialized) return;
    this.initialized = true;
    try {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          const url = event.urlAfterRedirects;
          this.zone.runOutsideAngular(() => this.defer(() => this.handleNavigation(url)));
        }
      });
    } catch {
      // tracker must never break the app
    }
  }

  /** Cookie banner: accepted → starts right away; declined → buffer and id are dropped. */
  setConsent(granted: boolean): void {
    try {
      this.consent = granted;
      if (!granted) {
        this.buffer = [];
        this.stopTimer();
        this.storage('local')?.removeItem(VISITOR_ID_KEY);
        this.storage('session')?.removeItem(VISIT_STARTED_KEY);
        return;
      }
      const url = this.lastUrl ?? this.safeRouterUrl();
      if (url != null) this.zone.runOutsideAngular(() => this.defer(() => this.handleNavigation(url)));
    } catch {
      // ignore
    }
  }

  /** visitorId for SR-206 error events: only with consent (never created otherwise). */
  consentedVisitorId(): string | undefined {
    try {
      if (!this.isBrowser || !this.enabled || !this.hasConsent()) return undefined;
      return this.visitorId() ?? undefined;
    } catch {
      return undefined;
    }
  }

  /** NavigationEnd handler (public for tests). */
  handleNavigation(url: string): void {
    try {
      this.lastUrl = url;
      if (!this.active()) return;
      this.visitStart(url);
      const pageType = pageTypeOf(url);
      this.record({
        action: 'PAGE_VIEW',
        pageType,
        pageUrl: stripQuery(url),
        searchQuery: pageType === 'SEARCH' ? searchQueryOf(url) : undefined,
      });
      if (pageType === 'CHECKOUT') this.record({action: 'CHECKOUT_OPEN', pageType, pageUrl: stripQuery(url)});
    } catch {
      // ignore
    }
  }

  cartChange(action: 'ADD_TO_CART' | 'REMOVE_FROM_CART', item: CartItem | null | undefined): void {
    try {
      if (!item || !this.active()) return;
      this.record({action, cart: [cartLine(item)]});
    } catch {
      // ignore
    }
  }

  click(button: TrackButton | '' | null | undefined): void {
    try {
      if (!button || !this.active()) return;
      this.record({action: 'CLICK', button, pageType: pageTypeOf(this.currentPath()), pageUrl: this.currentPath()});
    } catch {
      // ignore
    }
  }

  /** "Place order" pressed: phone, name, amount, payment method. No email, no card data. */
  checkoutSubmit(data: {phone?: string | null; firstName?: string | null; lastName?: string | null; amount?: number | null; paymentMethod?: string | null}): void {
    try {
      if (!this.active()) return;
      this.record({
        action: 'CHECKOUT_SUBMIT',
        customerPhone: nonEmpty(data.phone),
        customerName: nonEmpty(`${data.firstName ?? ''} ${data.lastName ?? ''}`),
        amount: data.amount ?? undefined,
        paymentMethod: data.paymentMethod ?? undefined,
      }, true);
    } catch {
      // ignore
    }
  }

  checkoutSuccess(orderTrackingNumber: string | null | undefined): void {
    try {
      if (!this.active()) return;
      this.record({action: 'CHECKOUT_SUCCESS', orderTrackingNumber: orderTrackingNumber ?? undefined}, true);
    } catch {
      // ignore
    }
  }

  checkoutFail(error: {status?: number; statusText?: string; error?: unknown} | null | undefined): void {
    try {
      if (!this.active()) return;
      const body = error?.error as {message?: unknown} | null | undefined;
      const detail = body && typeof body === 'object' && typeof body.message === 'string' ? body.message : (error?.statusText ?? '');
      this.record({
        action: 'CHECKOUT_FAIL',
        errorCode: checkoutFailCode(error),
        message: `${error?.status ?? ''} ${detail}`.trim() || undefined,
      }, true);
    } catch {
      // ignore
    }
  }

  /** Order summary page: links this visitor to the order, once per order. */
  orderLink(order: {orderNumber?: string | number | null; customer?: {firstName?: string; lastName?: string; phone?: string} | null} | null | undefined,
            trackingNumber: string | null | undefined): void {
    try {
      if (!order || !this.active()) return;
      const key = String(trackingNumber || order.orderNumber || '');
      if (!key) return;
      const local = this.storage('local');
      let linked: string[] = [];
      try {
        const raw = JSON.parse(local?.getItem(ORDER_LINKED_KEY) ?? '[]');
        if (Array.isArray(raw)) linked = raw.filter(x => typeof x === 'string');
      } catch {
        linked = [];
      }
      if (linked.includes(key)) return;
      this.record({
        action: 'ORDER_LINK',
        orderId: toNumber(order.orderNumber) ?? undefined,
        orderTrackingNumber: trackingNumber ?? undefined,
        customerPhone: nonEmpty(order.customer?.phone),
        customerName: nonEmpty(`${order.customer?.firstName ?? ''} ${order.customer?.lastName ?? ''}`),
      }, true);
      local?.setItem(ORDER_LINKED_KEY, JSON.stringify([...linked, key].slice(-ORDER_LINKED_KEEP)));
    } catch {
      // ignore
    }
  }

  /** Personal account opened: links this visitor to the site account, once per login (tab session). */
  customerLink(user: {accessToken?: string | null; givenName?: string | null; familyName?: string | null} | null | undefined): void {
    try {
      if (!user || !this.active()) return;
      const ref = this.accountRef(user.accessToken);
      const name = nonEmpty(`${user.givenName ?? ''} ${user.familyName ?? ''}`);
      const key = ref ?? name;
      if (!key) return;
      const session = this.storage('session');
      if (session?.getItem(CUSTOMER_LINKED_KEY) === key) return;
      this.record({action: 'CUSTOMER_LINK', customerRef: ref, customerName: name}, true);
      session?.setItem(CUSTOMER_LINKED_KEY, key);
    } catch {
      // ignore
    }
  }

  /** Sends everything buffered (batches of ≤ 50). */
  flush(): void {
    try {
      if (this.buffer.length === 0) return;
      const visitorId = this.hasConsent() ? this.visitorId() : null;
      if (!visitorId) {
        this.buffer = [];
        return;
      }
      const language = this.language();
      while (this.buffer.length) {
        const events = this.buffer.splice(0, TRACKER_BATCH_MAX);
        this.send({visitorId, language, events});
      }
    } catch {
      this.buffer = [];
    }
  }

  // ---- internals ----

  private active(): boolean {
    return this.isBrowser && this.enabled && this.hasConsent() && !this.isBot();
  }

  private hasConsent(): boolean {
    if (this.consent === null) {
      this.consent = this.storage('local')?.getItem(COOKIE_CONSENT_KEY) === 'accepted';
    }
    return this.consent;
  }

  private isBot(): boolean {
    return isBotNavigator(this.nav);
  }

  /** Existing or new UUID; called only with consent. */
  private visitorId(): string | null {
    const local = this.storage('local');
    if (!local) return null;
    let id = local.getItem(VISITOR_ID_KEY);
    if (!id || !UUID_RE.test(id)) {
      id = newUuid();
      local.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  }

  private visitStart(url: string): void {
    const session = this.storage('session');
    if (session?.getItem(VISIT_STARTED_KEY)) return;
    const params = this.queryParams(url);
    this.record({
      action: 'VISIT_START',
      pageType: pageTypeOf(url),
      pageUrl: stripQuery(url),
      referrer: nonEmpty(typeof document !== 'undefined' ? document.referrer : undefined),
      utmSource: nonEmpty(params.get('utm_source')),
      utmMedium: nonEmpty(params.get('utm_medium')),
      utmCampaign: nonEmpty(params.get('utm_campaign')),
      device: this.device(),
    });
    session?.setItem(VISIT_STARTED_KEY, '1');
  }

  private record(partial: Omit<VisitorEvent, 'eventId' | 'occurredAt'>, urgent = false): void {
    // the visitor id appears with the first recorded event, never before consent
    if (!this.visitorId()) return;
    this.buffer.push(cutEvent({eventId: newUuid(), occurredAt: new Date().toISOString(), ...partial}));
    this.ensureRunning();
    if (urgent || this.buffer.length >= TRACKER_FLUSH_AT) this.flush();
  }

  private send(body: VisitorBatch): void {
    postBeacon(this.nav, this.url, JSON.stringify(body));
  }

  private ensureRunning(): void {
    this.zone.runOutsideAngular(() => {
      if (this.timer === null) this.timer = setInterval(() => this.flush(), TRACKER_FLUSH_MS);
      if (!this.listening && typeof document !== 'undefined' && typeof window !== 'undefined') {
        this.listening = true;
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') this.flush();
        });
        window.addEventListener('pagehide', () => this.flush());
      }
    });
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /** Idle time, so the tracker never competes with rendering/hydration. */
  private defer(fn: () => void): void {
    const w = globalThis as {requestIdleCallback?: (cb: () => void, opts?: {timeout: number}) => number};
    if (typeof w.requestIdleCallback === 'function') {
      w.requestIdleCallback(() => fn(), {timeout: 3000});
    } else {
      setTimeout(fn, 0);
    }
  }

  private device(): 'MOBILE' | 'TABLET' | 'DESKTOP' {
    return deviceOf(this.nav);
  }

  private language(): string | undefined {
    return siteLanguageOf(this.currentPath());
  }

  private currentPath(): string {
    if (this.lastUrl) return stripQuery(this.lastUrl);
    return typeof location !== 'undefined' ? location.pathname : '';
  }

  private queryParams(url: string): URLSearchParams {
    const query = url.split('#')[0].split('?')[1];
    if (query) return new URLSearchParams(query);
    return new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
  }

  private safeRouterUrl(): string | null {
    try {
      return this.initialized && this.router.navigated ? this.router.url : null;
    } catch {
      return null;
    }
  }

  /** Account id = JWT subject; the token itself never leaves the browser. */
  private accountRef(token: string | null | undefined): string | undefined {
    if (!token) return undefined;
    try {
      const part = token.split('.')[1];
      if (!part) return undefined;
      const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
      const payload = JSON.parse(decodeURIComponent(Array.from(json, c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')));
      const sub = payload?.sub ?? payload?.userId ?? payload?.id;
      return sub != null ? String(sub) : undefined;
    } catch {
      return undefined;
    }
  }

  private storage(kind: 'local' | 'session'): Storage | null {
    try {
      if (typeof window === 'undefined') return null;
      return kind === 'local' ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  }
}
