import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { environment } from '../../../environments/environment';
import { Product } from '../../entities/product';
import { CartItem } from '../../entities/cart-item';
import { OrderReview } from '../../entities/order-review';
import { OrderStatus } from '../../entities/order';

declare let gtag: any;

export interface AnalyticsConfig {
  measurementId: string;
  hosts: readonly string[];
}

export function isAnalyticsHost(hostname: string | null | undefined, hosts: readonly string[]): boolean {
  const h = (hostname ?? '').toLowerCase();
  return !!h && hosts.some(x => x.toLowerCase() === h);
}

// purchase шлём только по оплаченному заказу; статус не пришёл - шлём (совместимость)
export function isPurchaseTrackable(status?: OrderStatus | null): boolean {
  return status !== 'PAYMENT_WAITING' && status !== 'PAYMENT_FAILED' && status !== 'CANCELLED';
}

// токен доступа к заказу (UUID в URL страницы успеха) в аналитику не отдаём
export function sanitizeAnalyticsPath(url: string): string {
  return url.replace(/^(\/[^/?#]+\/order-success)\/[^?#]*(?:[?#].*)?$/, '$1');
}

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalytics {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly document = inject(DOCUMENT);
  private readonly sentPurchases = new Set<string>();
  private static readonly PURCHASE_KEY = 'ga4_purchase_sent';
  private static readonly PURCHASE_KEEP = 50;

  // GA4 грузим только на боевых хостах; на остальных gtag не определяется, все track*/send - no-op
  init(config: AnalyticsConfig = environment.analytics): void {
    if (!this.isBrowser || !config?.measurementId) return;
    if (!isAnalyticsHost(this.document.location?.hostname, config.hosts)) return;
    const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.measurementId)}`;
    if (this.document.querySelector(`script[src="${src}"]`)) return;
    const w = window as any;

    w.dataLayer = w.dataLayer || [];
    w.gtag = function () {
      // gtag.js ждёт именно Arguments-объект, не массив
      // eslint-disable-next-line prefer-rest-params
      w.dataLayer.push(arguments);
    };
    gtag('consent', 'default', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied'
    });
    gtag('js', new Date());
    // первый page_view отправит роутер (NavigationEnd) уже с очищенным путём
    gtag('config', config.measurementId, { send_page_view: false });

    const script = this.document.createElement('script');
    script.async = true;
    script.src = src;
    this.document.head.appendChild(script);
  }

  public sendPageView(url: string): void {
    if (typeof gtag !== 'undefined') {
      const page_path = sanitizeAnalyticsPath(url);
      const page_location = this.document.location.origin + page_path;
      // set: последующие события (purchase) тоже уйдут с очищенным page_location
      gtag('set', { page_location, page_path });
      gtag('event', 'page_view', { page_location, page_path });
    }
  }

  send(data: GaEventData) {
    if (typeof gtag !== 'function') {
      console.warn('Google Analytics is not loaded!');
      return;
    }

    gtag('event', data.event, {
      event_category: data.category,
      event_label: data.label,
      value: data.value
    });
  }

  trackPurchase(order: OrderReview): void {
    const id = order?.orderNumber ? String(order.orderNumber) : '';
    if (!id || !this.canTrack() || !isPurchaseTrackable(order.status) || this.wasPurchaseSent(id)) return;
    // у позиции заказа product.id - внутренний id БД, поэтому в item_id он не попадает
    const items = (order.items ?? []).map(i => this.toItem(i.product, i.quantity, i.sizeType, i.price, false));
    gtag('event', 'purchase', {
      transaction_id: id,
      value: this.num(order.totalAmountOrder),
      currency: this.currency,
      shipping: this.num(order.shippingCost),
      items
    });
    this.markPurchaseSent(id);
  }

  trackAddToCart(product: Product, quantity: number, variant?: string): void {
    if (!this.canTrack()) return;
    const items = [this.toItem(product, quantity, variant, product.price, true)];
    gtag('event', 'add_to_cart', {
      currency: this.currency,
      value: this.num(this.num(product.price) * (quantity || 1)),
      items
    });
  }

  trackBeginCheckout(cartItems: CartItem[], value: number): void {
    if (!this.canTrack() || !cartItems?.length) return;
    const items = cartItems.map(i => this.toItem(i.product, i.quantity, i.size?.sizeType, i.product?.price, true));
    gtag('event', 'begin_checkout', { currency: this.currency, value: this.num(value), items });
  }

  private readonly currency = 'MDL';

  private canTrack(): boolean {
    return this.isBrowser && typeof gtag === 'function';
  }

  private num(v: unknown): number {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
  }

  // item_id: article, иначе appId, иначе id (только у каталожного товара id == appId)
  private toItem(p: Product | undefined, quantity: number, variant: string | undefined, price: unknown, catalog: boolean) {
    const id = p?.article || p?.appId || (catalog ? p?.id : undefined);
    return {
      item_id: id != null ? String(id) : undefined,
      item_name: p?.name,
      item_variant: variant || undefined,
      item_brand: p?.brand || undefined,
      price: this.num(price),
      quantity: quantity || 1
    };
  }

  private wasPurchaseSent(id: string): boolean {
    if (this.sentPurchases.has(id)) return true;
    try {
      const list = JSON.parse(localStorage.getItem(GoogleAnalytics.PURCHASE_KEY) ?? '[]');
      return Array.isArray(list) && list.includes(id);
    } catch {
      return false;
    }
  }

  private markPurchaseSent(id: string): void {
    this.sentPurchases.add(id);
    try {
      const raw = JSON.parse(localStorage.getItem(GoogleAnalytics.PURCHASE_KEY) ?? '[]');
      const list: string[] = Array.isArray(raw) ? raw : [];
      list.push(id);
      localStorage.setItem(GoogleAnalytics.PURCHASE_KEY, JSON.stringify(list.slice(-GoogleAnalytics.PURCHASE_KEEP)));
    } catch {
      // storage недоступен - дедуп только в памяти
    }
  }

  grantConsent() {
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      'ad_storage': 'granted',
      'analytics_storage': 'granted'
    });
  }

  denyConsent() {
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied'
    });
  }
}

export interface GaEventData {
  event: string;
  category?: string;
  label?: string;
  value?: number;
}
