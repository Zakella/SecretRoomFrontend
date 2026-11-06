import {Injectable, signal} from '@angular/core';

/** What the visitor asks about: shown as a draft card above the input until sent (contract, «Сайт: Спросить в чате»). */
export interface ChatProductDraft {
  /** appId of the product on webstore (= id in the product URL). */
  productId: number;
  name: string;
  price: number | null;
  oldPrice: number | null;
  imageUrl: string | null;
}

/**
 * SR-220: "Ask in chat" from a page to the chat widget. The widget is created later (`@defer (on idle)`),
 * so the request waits here and the widget takes it when it appears. No browser APIs — safe under SSR.
 */
@Injectable({providedIn: 'root'})
export class ChatAsk {
  private readonly _available = signal(true);
  private readonly _request = signal<ChatProductDraft | null>(null);

  /** false once the widget got 404 (chat switched off) or will never show (bot): the button goes away. */
  readonly available = this._available.asReadonly();
  /** Pending request, null — nothing to do. */
  readonly request = this._request.asReadonly();

  ask(product: ChatProductDraft): void {
    if (!this._available() || !Number.isSafeInteger(product.productId) || product.productId <= 0) return;
    this._request.set({...product});
  }

  /** The widget takes the request (once). */
  take(): ChatProductDraft | null {
    const request = this._request();
    if (request) this._request.set(null);
    return request;
  }

  disable(): void {
    this._available.set(false);
    this._request.set(null);
  }
}
