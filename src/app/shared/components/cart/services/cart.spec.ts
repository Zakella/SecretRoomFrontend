import {TestBed} from '@angular/core/testing';
import {CartUi} from './cart';
import {AddedToCart} from './added-to-cart';
import {CartItem} from '../../../../entities/cart-item';
import {Product} from '../../../../entities/product';

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {id: '1', name: 'Test', price: 100, ...overrides} as Product;
}

function makeCartItem(product?: Partial<Product>, qty = 1): CartItem {
  return new CartItem(makeProduct(product), qty);
}

describe('CartUi', () => {
  let cart: CartUi;

  beforeEach(() => {
    localStorage.clear();
    cart = TestBed.inject(CartUi);
  });

  it('should start with empty cart', () => {
    expect(cart.cartItems.value.length).toBe(0);
    expect(cart.totalAmount.value).toBe(0);
    expect(cart.totalQuantity.value).toBe(0);
  });

  describe('addToCart', () => {
    it('should add a new item', () => {
      cart.addToCart(makeCartItem());
      expect(cart.cartItems.value.length).toBe(1);
      expect(cart.cartCount()).toBe(1);
    });

    it('should increase quantity for duplicate product', () => {
      cart.addToCart(makeCartItem({id: '1'}, 1));
      cart.addToCart(makeCartItem({id: '1'}, 2));
      expect(cart.cartItems.value.length).toBe(1);
      expect(cart.cartItems.value[0].quantity).toBe(3);
    });

    it('should add different products separately', () => {
      cart.addToCart(makeCartItem({id: '1'}));
      cart.addToCart(makeCartItem({id: '2'}));
      expect(cart.cartItems.value.length).toBe(2);
    });

    it('should not exceed maxStock', () => {
      cart.addToCart(makeCartItem({id: '1', unitsInStock: 3}, 2));
      cart.addToCart(makeCartItem({id: '1', unitsInStock: 3}, 5));
      expect(cart.cartItems.value[0].quantity).toBe(3);
    });

    it('should not add item with 0 stock', () => {
      cart.addToCart(makeCartItem({id: '1', unitsInStock: 0}));
      expect(cart.cartItems.value.length).toBe(0);
    });

    describe('confirmation', () => {
      let added: AddedToCart;
      beforeEach(() => {
        added = TestBed.inject(AddedToCart);
      });
      afterEach(() => added.hide());

      it('does not open the drawer, shows the confirmation', () => {
        const item = makeCartItem();
        cart.addToCart(item);
        expect(cart.visible()).toBeFalse();
        expect(added.item()).toBe(item);
      });

      it('does not show the confirmation when the drawer is open', () => {
        cart.open();
        cart.addToCart(makeCartItem());
        expect(cart.cartItems.value.length).toBe(1);
        expect(added.item()).toBeNull();
        expect(added.addedTick()).toBe(1);
      });

      it('does not show the confirmation for zero stock', () => {
        cart.addToCart(makeCartItem({unitsInStock: 0}));
        expect(added.item()).toBeNull();
        expect(added.addedTick()).toBe(0);
      });
    });
  });

  describe('computeCartTotals', () => {
    it('should compute correct totals', () => {
      cart.addToCart(makeCartItem({id: '1', price: 50}, 2));
      cart.addToCart(makeCartItem({id: '2', price: 30}, 3));
      expect(cart.totalAmount.value).toBe(190);
      expect(cart.totalQuantity.value).toBe(5);
    });
  });

  describe('deleteItemFromCart', () => {
    it('should remove item by index', () => {
      cart.addToCart(makeCartItem({id: '1'}));
      cart.addToCart(makeCartItem({id: '2'}));
      cart.deleteItemFromCart(0);
      expect(cart.cartItems.value.length).toBe(1);
      expect(cart.cartItems.value[0].product.id).toBe('2');
    });
  });

  describe('updatePrices (SR-245, 409 PRICE_CHANGED)', () => {
    const variantItem = (id: string, price: number, qty: number, variantAppId?: number) =>
      new CartItem(makeProduct({id, price}), qty, undefined, variantAppId);

    it('sets the new unit price of the matching product + variant, recomputes totals and saves the cart', () => {
      cart.addToCart(variantItem('101', 280, 2, 9));
      cart.addToCart(variantItem('101', 280, 1, 10));
      cart.addToCart(variantItem('5', 40, 1));
      const emitted: number[] = [];
      cart.cartItems.subscribe(() => emitted.push(1));

      const changed = cart.updatePrices([{productId: 101, variantAppId: 9, newPrice: 300}]);

      expect(changed).toBe(1);
      const [a, b, c] = cart.cartItems.value;
      expect(a.product.price).toBe(300);
      expect(a.amount).toBe(600);
      expect(b.product.price).toBe(280);
      expect(c.product.price).toBe(40);
      expect(cart.totalAmount.value).toBe(600 + 280 + 40);
      expect(emitted.length).toBe(2);
      const saved = JSON.parse(localStorage.getItem('cartItems')!);
      expect(saved[0].product.price).toBe(300);
    });

    it('a detail without variant matches only the item without variant', () => {
      cart.addToCart(variantItem('5', 40, 1));
      cart.addToCart(variantItem('5', 40, 1, 3));
      expect(cart.updatePrices([{productId: 5, variantAppId: null, newPrice: 50}])).toBe(1);
      expect(cart.cartItems.value.map(i => i.product.price)).toEqual([50, 40]);
    });

    it('nothing matches — the cart is not touched', () => {
      cart.addToCart(variantItem('5', 40, 1));
      const before = cart.cartItems.value;
      expect(cart.updatePrices([{productId: 7, variantAppId: null, newPrice: 50}])).toBe(0);
      expect(cart.cartItems.value).toBe(before);
    });
  });

  describe('clearCart', () => {
    it('should empty the cart', () => {
      cart.addToCart(makeCartItem());
      cart.clearCart();
      expect(cart.cartItems.value.length).toBe(0);
      expect(cart.totalAmount.value).toBe(0);
      expect(cart.cartCount()).toBe(0);
    });
  });

  describe('visibility', () => {
    it('should open and close cart', () => {
      expect(cart.visible()).toBeFalse();
      cart.open();
      expect(cart.visible()).toBeTrue();
      cart.close();
      expect(cart.visible()).toBeFalse();
    });
  });
});
