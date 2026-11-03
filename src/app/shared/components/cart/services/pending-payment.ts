import {inject, Injectable, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {Observable, of} from 'rxjs';
import {catchError, finalize, map, shareReplay} from 'rxjs/operators';
import {PurchaseService} from '../../../../@core/api/purchase';
import {OrderStatus} from '../../../../entities/order';
import {CartUi} from './cart';

export const PENDING_PAYMENT_KEY = 'pendingPayment';
/** A marker older than this is dropped: MAIB times out long before. */
export const PENDING_PAYMENT_TTL_MS = 24 * 60 * 60 * 1000;

/** none — no marker; paid — cart cleared; failed — cart kept; waiting — payment still open. */
export type PendingPaymentOutcome = 'none' | 'paid' | 'failed' | 'waiting';

interface Marker {
  trackingNumber: string;
  createdAt: number;
}

/**
 * Online payment: the cart is kept while the customer is on MAIB, so a failed payment does not
 * lose it. A localStorage marker remembers which order is awaiting payment; the cart is cleared
 * only once that order is known to be paid.
 */
@Injectable({providedIn: 'root'})
export class PendingPayment {
  private purchaseService = inject(PurchaseService);
  private cartService = inject(CartUi);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private inflight: Observable<PendingPaymentOutcome> | null = null;

  mark(trackingNumber: string): void {
    if (!this.isBrowser || !trackingNumber) return;
    try {
      const marker: Marker = {trackingNumber, createdAt: Date.now()};
      localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify(marker));
    } catch {
      // storage unavailable — reconciliation just will not happen
    }
  }

  /** Tracking number of the order awaiting payment, or null. */
  get(): string | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(PENDING_PAYMENT_KEY);
      if (!raw) return null;
      const marker = JSON.parse(raw) as Partial<Marker>;
      if (!marker?.trackingNumber || typeof marker.createdAt !== 'number'
        || Date.now() - marker.createdAt > PENDING_PAYMENT_TTL_MS) {
        this.clear();
        return null;
      }
      return marker.trackingNumber;
    } catch {
      this.clear();
      return null;
    }
  }

  clear(): void {
    if (!this.isBrowser) return;
    try {
      localStorage.removeItem(PENDING_PAYMENT_KEY);
    } catch {
      // ignore
    }
  }

  /**
   * Order-success page loaded the order: if it is the one awaiting payment, the cart goes away
   * (unless the payment failed). Carts unrelated to the marker are never touched.
   */
  settle(trackingNumber: string, status: OrderStatus | undefined): PendingPaymentOutcome {
    if (this.get() !== trackingNumber) return 'none';
    if (status === 'PAYMENT_FAILED') {
      this.clear();
      return 'failed';
    }
    this.cartService.clearCart();
    this.clear();
    return 'paid';
  }

  /** Asks the backend about the order awaiting payment and clears the cart if it got paid. */
  reconcile(): Observable<PendingPaymentOutcome> {
    const trackingNumber = this.get();
    if (!trackingNumber) return of('none');
    if (this.inflight) return this.inflight;

    this.inflight = this.purchaseService.getOrderDetails(trackingNumber).pipe(
      map(order => this.apply(trackingNumber, order?.status)),
      catchError(err => {
        if (err?.status === 404) this.clear();
        return of<PendingPaymentOutcome>('none');
      }),
      finalize(() => this.inflight = null),
      shareReplay({bufferSize: 1, refCount: false})
    );
    return this.inflight;
  }

  private apply(trackingNumber: string, status: OrderStatus | undefined): PendingPaymentOutcome {
    if (this.get() !== trackingNumber) return 'none';
    if (!status || status === 'PAYMENT_WAITING') return 'waiting';
    if (status === 'PAYMENT_FAILED') {
      this.clear();
      return 'failed';
    }
    this.cartService.clearCart();
    this.clear();
    return 'paid';
  }
}
