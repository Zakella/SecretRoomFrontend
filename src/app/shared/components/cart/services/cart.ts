import {Injectable, signal} from '@angular/core';
import {CartItem} from '../../../../entities/cart-item';
import {BehaviorSubject, Subject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CartUi {
  private _visible = signal<boolean>(false);
  public cartCount = signal<number>(0);
  visible = this._visible.asReadonly();
  public cartItems: BehaviorSubject<CartItem[]> = new BehaviorSubject<CartItem[]>([]);
  public totalAmount: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public totalQuantity: BehaviorSubject<number> = new BehaviorSubject<number>(0);
  public cartModified: Subject<boolean> = new Subject<boolean>();
  private readonly storageKey = 'cartItems';

  constructor() {
    this.cartItems.next(this.loadCartItemsFromStorage());
    this.computeCartTotals();
  }


  getMaxStock(cartItem: CartItem): number | undefined {
    if (cartItem.variantAppId && cartItem.product.variants?.length) {
      const variant = cartItem.product.variants.find(v => v.appId === cartItem.variantAppId);
      if (variant?.unitsInStock != null) {
        return variant.unitsInStock;
      }
    }
    return cartItem.product.unitsInStock;
  }

  addToCart(theCartItem: CartItem) {
    const currentItems = [...this.cartItems.value];
    const existingCartItemIndex = this.findExistingCartItemIndex(currentItems, theCartItem);
    const maxStock = this.getMaxStock(theCartItem);

    if (maxStock != null && maxStock <= 0) {
      return;
    }

    if (existingCartItemIndex !== -1) {
      const existing = currentItems[existingCartItemIndex];
      const newQty = existing.quantity + theCartItem.quantity;
      if (maxStock != null && maxStock > 0) {
        this.updateExistingCartItem(currentItems, existingCartItemIndex, Math.min(newQty, maxStock) - existing.quantity);
      } else {
        this.updateExistingCartItem(currentItems, existingCartItemIndex, theCartItem.quantity);
      }
    } else {
      if (maxStock != null && maxStock > 0) {
        theCartItem.quantity = Math.min(theCartItem.quantity, maxStock);
      }
      currentItems.push(theCartItem);
    }

    this.cartItems.next(currentItems);
    this.saveCartItemsToStorage();
    this.computeCartTotals();
    this.open();
    this.cartCount.set(currentItems?.length || 0);
  }

  private findExistingCartItemIndex(cartItems: CartItem[], newItem: CartItem): number {
    return cartItems.findIndex(item =>
      item.product.id === newItem.product.id &&
      item.size?.sizeType === newItem.size?.sizeType &&
      item.variantAppId === newItem.variantAppId
    );
  }

  private updateExistingCartItem(cartItems: CartItem[], index: number, additionalQuantity: number) {
    const existingCartItem = cartItems[index];
    existingCartItem.quantity += additionalQuantity;
    existingCartItem.amount = existingCartItem.quantity * (existingCartItem.product.price || 0);
  }


  computeCartTotals() {
    let totalAmountValue: number = 0;
    let totalQuantityValue: number = 0;

    for (let currentCartItem of this.cartItems.value) {
      totalAmountValue += this.calculateCartItemAmount(currentCartItem);
      totalQuantityValue += currentCartItem.quantity;
      currentCartItem.amount = this.calculateCartItemAmount(currentCartItem);
    }

    this.totalAmount.next(totalAmountValue);
    this.totalQuantity.next(totalQuantityValue);
  }

  private calculateCartItemAmount(cartItem: CartItem): number {
    return cartItem.quantity * (cartItem.product.price !== undefined ? cartItem.product.price : 0);
  }

  private saveCartItemsToStorage() {
    if (this.isBrowser()) {
      try {
        const cartItemsJson = JSON.stringify(this.cartItems.value);
        localStorage.setItem(this.storageKey, cartItemsJson);
        this.cartModified.next(true);
      } catch (e) {
        console.error("Error saving cart items to storage:", e);
      }
    }
  }

  loadCartItemsFromStorage(): CartItem[] {
    if (!this.isBrowser()) {
      this.cartCount.set(0);
      return [];
    }

    try {
      const cartItemsJson = localStorage.getItem(this.storageKey);

      if (!cartItemsJson) {
        this.cartCount.set(0);
        return [];
      }

      const items = JSON.parse(cartItemsJson);
      this.cartCount.set(items.length);
      return items;

    } catch (e) {
      console.error("Error loading cart items from storage:", e);
      this.cartCount.set(0);
      return [];
    }
  }


  deleteItemFromCart(index: number) {
    const currentValue = this.cartItems.value;
    currentValue.splice(index, 1);
    this.cartItems.next(currentValue);
    this.saveCartItemsToStorage();
    this.computeCartTotals();
    this.cartModified.next(true);
    this.cartCount.set(currentValue?.length || 0);
  }

  recalculateCartItem(cartItem: CartItem, index: number) {
    const maxStock = this.getMaxStock(cartItem);
    if (maxStock != null && maxStock > 0 && cartItem.quantity > maxStock) {
      cartItem.quantity = maxStock;
    }
    const currentValue = this.cartItems.value;
    currentValue[index] = cartItem;
    this.cartItems.next(currentValue);
    this.saveCartItemsToStorage();
    this.computeCartTotals();
    this.cartModified.next(true);
  }


  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }

  open() {
    this._visible.set(true);
  }

  close() {
    this._visible.set(false);
  }

  clearCart() {
    this.cartItems.next([]);
    this.totalAmount.next(0);
    this.totalQuantity.next(0);
    this.cartCount.set(0);
    if (this.isBrowser()) {
      localStorage.removeItem(this.storageKey);
    }
    this.cartModified.next(true);
  }
}
