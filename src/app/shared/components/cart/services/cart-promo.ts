import {computed, DestroyRef, inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {of} from 'rxjs';
import {catchError, debounceTime, map, switchMap} from 'rxjs/operators';
import {CartUi} from './cart';
import {CartItem} from '../../../../entities/cart-item';
import {CartCalculation, CartCalculationItem, CartCalculationLine, PromotionBadge} from '../../../../entities/promotion';
import {CartCalculationApi} from '../../../../@core/api/cart-calculation';

/** Pause after the last cart change before asking the server. */
export const CART_PROMO_DEBOUNCE_MS = 300;

/** Server totals of the cart (SR-229). null — use the client totals as before. */
export interface CartPromoView {
  /** Line i of the cart, in cart order. */
  lines: CartCalculationLine[];
  /** Σ price × qty — the subtotal before promotions. */
  itemsTotal: number;
  promotionSavings: number;
  /** To pay for the goods, without delivery. */
  total: number;
}

/**
 * A cart line as shown when the cart has a server result: every line comes from the server, never from the catalog
 * price saved in the cart (it may carry a PERCENT price the server did not apply — SR-229 QA).
 */
export interface CartPromoLineView {
  /** To pay for the line (lineTotal). */
  total: number;
  /** unitPrice × qty when the line pays less (product discount and/or promotion); null — nothing to cross out. */
  oldTotal: number | null;
  /** The promotion that won on this line; null — no label, no «online only». */
  promotion: PromotionBadge | null;
}

export function toLineView(line: CartCalculationLine | null): CartPromoLineView | null {
  if (!line) return null;
  const base = Math.round(line.unitPrice * line.quantity * 100) / 100;
  return {total: line.lineTotal, oldTotal: line.lineTotal < base ? base : null, promotion: line.promotion ?? null};
}

function toRequestItems(items: CartItem[]): CartCalculationItem[] {
  return items.map(item => ({
    productId: Number(item.product?.id),
    variantAppId: item.variantAppId ?? null,
    quantity: item.quantity,
  }));
}

/** What the server result was computed for; a result for another cart state is never shown. */
function cartKey(items: CartCalculationItem[]): string {
  return items.map(i => `${i.productId}:${i.variantAppId ?? ''}:${i.quantity}`).join('|');
}

/**
 * Recalculates the cart on the server (POST v1/cart/calculate) on every cart change: debounce, the previous request
 * is cancelled. Error, old webstore, empty cart or SSR — no result, the cart and checkout show client totals.
 */
@Injectable({providedIn: 'root'})
export class CartPromo {
  private cart = inject(CartUi);
  private api = inject(CartCalculationApi);

  /** Key of the current cart state. */
  private currentKey = signal('');
  /** Last server result and the cart state it belongs to. */
  private result = signal<{key: string; calculation: CartCalculation} | null>(null);

  readonly view = computed<CartPromoView | null>(() => {
    const result = this.result();
    if (!result || result.key !== this.currentKey()) return null;
    const {lines, itemsTotal, promotionSavings, total} = result.calculation;
    return {lines, itemsTotal, promotionSavings, total};
  });

  constructor() {
    if (!isPlatformBrowser(inject(PLATFORM_ID))) return;
    const subscription = this.cart.cartItems.pipe(
      map(items => {
        const request = toRequestItems(items ?? []);
        const key = cartKey(request);
        this.currentKey.set(key);
        return {request, key};
      }),
      debounceTime(CART_PROMO_DEBOUNCE_MS),
      switchMap(({request, key}) => {
        if (request.length === 0) return of(null);
        return this.api.calculate({items: request}).pipe(
          map(calculation => this.isConsistent(calculation, request) ? {key, calculation} : null),
          catchError(() => of(null)),
        );
      }),
    ).subscribe(result => this.result.set(result));
    inject(DestroyRef).onDestroy(() => subscription.unsubscribe());
  }

  /** Server line for cart line `index`, if the current cart has a server result. */
  line(index: number): CartCalculationLine | null {
    return this.view()?.lines[index] ?? null;
  }

  private isConsistent(calculation: CartCalculation | null, request: CartCalculationItem[]): boolean {
    return !!calculation
      && Array.isArray(calculation.lines)
      && calculation.lines.length === request.length
      && typeof calculation.total === 'number'
      && typeof calculation.itemsTotal === 'number'
      // An unknown product comes back with zeros: the server total would be lower than the cart — keep the client one.
      && calculation.lines.every(line => line && line.available !== false);
  }
}
