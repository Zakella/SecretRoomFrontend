import {fakeAsync, TestBed, tick} from '@angular/core/testing';
import {ADDED_TO_CART_HIDE_MS, AddedToCart} from './added-to-cart';
import {CartItem} from '../../../../entities/cart-item';
import {Product} from '../../../../entities/product';

const item = (id: string) => new CartItem({id, name: 'P' + id, price: 10} as Product, 1);

describe('AddedToCart', () => {
  let svc: AddedToCart;

  beforeEach(() => {
    svc = TestBed.inject(AddedToCart);
  });

  it('is hidden initially', () => {
    expect(svc.item()).toBeNull();
    expect(svc.addedTick()).toBe(0);
  });

  it('show sets the item and bumps tick', () => {
    const a = item('1');
    svc.show(a);
    expect(svc.item()).toBe(a);
    expect(svc.addedTick()).toBe(1);
    svc.hide();
  });

  it('repeated show replaces the item and restarts the timer', fakeAsync(() => {
    svc.show(item('1'));
    tick(ADDED_TO_CART_HIDE_MS - 1000);
    const b = item('2');
    svc.show(b);
    tick(ADDED_TO_CART_HIDE_MS - 1000);
    expect(svc.item()).toBe(b);
    tick(1000);
    expect(svc.item()).toBeNull();
  }));

  it('auto-hides after 4s', fakeAsync(() => {
    svc.show(item('1'));
    tick(3999);
    expect(svc.item()).not.toBeNull();
    tick(1);
    expect(svc.item()).toBeNull();
  }));

  it('pause stops the timer, resume restarts it', fakeAsync(() => {
    svc.show(item('1'));
    svc.pause();
    tick(10000);
    expect(svc.item()).not.toBeNull();
    svc.resume();
    tick(3999);
    expect(svc.item()).not.toBeNull();
    tick(1);
    expect(svc.item()).toBeNull();
  }));

  it('resume without pause does not restart the timer', fakeAsync(() => {
    svc.show(item('1'));
    tick(3000);
    svc.resume();
    tick(1000);
    expect(svc.item()).toBeNull();
  }));

  it('hide closes immediately and cancels the timer', fakeAsync(() => {
    svc.show(item('1'));
    svc.hide();
    expect(svc.item()).toBeNull();
    tick(ADDED_TO_CART_HIDE_MS);
  }));
});
