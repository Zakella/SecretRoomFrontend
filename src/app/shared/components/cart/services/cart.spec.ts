import {CartUi} from './cart';
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
    cart = new CartUi();
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
