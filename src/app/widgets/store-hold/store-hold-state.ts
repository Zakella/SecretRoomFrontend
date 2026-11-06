import {DestroyRef, inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {NavigationStart, Router} from '@angular/router';
import {Product} from '../../entities/product';

/** What the hold dialog is opened for: one product and one size of it. */
export interface StoreHoldRequest {
  /** Card id on the site (= appId in the admin). */
  productId: number;
  /** appId of the size; null for a product without sizes. */
  variantAppId: number | null;
  productName: string;
  size: string | null;
  price: number | null;
  imageUrl: string | null;
}

/** Card id for the store hold API (the API sends the card id in `id`, `appId` of the product is empty). */
export function holdProductId(product: Pick<Product, 'id' | 'appId'>): number | null {
  const id = Number(product.id ?? product.appId);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Dialog request for one size of a full product card; null when the card has no usable id. */
export function holdRequestFor(
  product: Product, lang: string, variantAppId: number | null, size: string | null, price?: number | null,
): StoreHoldRequest | null {
  const productId = holdProductId(product);
  if (productId == null) return null;
  const localized = lang === 'ru' ? product.nameRu : product.nameRo;
  const name = localized || product.name || '';
  return {
    productId,
    variantAppId,
    productName: name.charAt(0).toUpperCase() + name.slice(1),
    size: size || null,
    price: price ?? product.price ?? null,
    imageUrl: product.imageURL ?? null,
  };
}

/** localStorage: only the number of the last hold, never the phone or the name. */
export const LAST_HOLD_KEY = 'sr_store_hold_last';

/** Shared state of the store hold (SR-223): the open dialog and the kill switch. */
@Injectable({providedIn: 'root'})
export class StoreHoldState {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _request = signal<StoreHoldRequest | null>(null);
  private readonly _disabled = signal(false);

  /** Product the dialog is open for, null when it is closed. */
  readonly request = this._request.asReadonly();
  /** The API answered HOLD_DISABLED: hold buttons stay hidden until the page is reloaded. */
  readonly disabled = this._disabled.asReadonly();

  constructor() {
    // The dialog must not outlive the page it was opened on.
    const sub = inject(Router).events.subscribe(event => {
      if (event instanceof NavigationStart) this.close();
    });
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  open(request: StoreHoldRequest): void {
    if (this._disabled()) return;
    this._request.set(request);
  }

  close(): void {
    this._request.set(null);
  }

  markDisabled(): void {
    this._disabled.set(true);
  }

  saveLastNumber(number: string): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(LAST_HOLD_KEY, number);
    } catch {
      // storage blocked (private mode): the number is still on screen
    }
  }

  lastNumber(): string | null {
    if (!this.isBrowser) return null;
    try {
      return localStorage.getItem(LAST_HOLD_KEY);
    } catch {
      return null;
    }
  }
}
