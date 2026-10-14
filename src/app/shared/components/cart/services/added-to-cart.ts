import {DestroyRef, inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {CartItem} from '../../../../entities/cart-item';

/** Auto-hide delay of the "added to cart" confirmation. */
export const ADDED_TO_CART_HIDE_MS = 4000;

/**
 * Lightweight state of the compact "added to cart" confirmation.
 * Holds a single item: a repeated add replaces it and restarts the timer.
 * Timers run in the browser only.
 */
@Injectable({providedIn: 'root'})
export class AddedToCart {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly _item = signal<CartItem | null>(null);
  private readonly _tick = signal(0);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private paused = false;

  /** Item shown in the confirmation, null when hidden. */
  readonly item = this._item.asReadonly();
  /** Incremented on every add; used to restart the cart badge animation. */
  readonly addedTick = this._tick.asReadonly();

  constructor() {
    inject(DestroyRef).onDestroy(() => this.clearTimer());
  }

  /** Bumps the badge animation tick without showing the confirmation. */
  notifyAdded(): void {
    this._tick.update(v => v + 1);
  }

  show(item: CartItem): void {
    this.notifyAdded();
    this._item.set(item);
    this.paused = false;
    this.startTimer();
  }

  hide(): void {
    this.clearTimer();
    this.paused = false;
    this._item.set(null);
  }

  pause(): void {
    this.paused = true;
    this.clearTimer();
  }

  resume(): void {
    if (!this.paused || !this._item()) return;
    this.paused = false;
    this.startTimer();
  }

  private startTimer(): void {
    this.clearTimer();
    if (!this.isBrowser) return;
    this.timer = setTimeout(() => this.hide(), ADDED_TO_CART_HIDE_MS);
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
