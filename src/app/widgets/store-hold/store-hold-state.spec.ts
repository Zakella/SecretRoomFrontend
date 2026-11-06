import {PLATFORM_ID} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {NavigationStart, provideRouter, Router} from '@angular/router';
import {Subject} from 'rxjs';
import {Product} from '../../entities/product';
import {holdProductId, holdRequestFor, LAST_HOLD_KEY, StoreHoldRequest, StoreHoldState} from './store-hold-state';

const REQUEST: StoreHoldRequest = {
  productId: 123, variantAppId: 456, productName: 'Bra', size: '75B', price: 499, imageUrl: null,
};

describe('StoreHoldState (SR-223)', () => {
  function setup(platform: 'browser' | 'server' = 'browser') {
    TestBed.configureTestingModule({providers: [provideRouter([]), {provide: PLATFORM_ID, useValue: platform}]});
    return TestBed.inject(StoreHoldState);
  }

  afterEach(() => localStorage.removeItem(LAST_HOLD_KEY));

  it('open / close', () => {
    const state = setup();
    state.open(REQUEST);
    expect(state.request()).toEqual(REQUEST);
    state.close();
    expect(state.request()).toBeNull();
  });

  it('after HOLD_DISABLED the dialog does not open any more', () => {
    const state = setup();
    state.markDisabled();
    expect(state.disabled()).toBeTrue();
    state.open(REQUEST);
    expect(state.request()).toBeNull();
  });

  it('closes on navigation', () => {
    const events = new Subject<unknown>();
    TestBed.configureTestingModule({providers: [{provide: Router, useValue: {events}}]});
    const state = TestBed.inject(StoreHoldState);
    state.open(REQUEST);
    events.next(new NavigationStart(1, '/ro/store-hold'));
    expect(state.request()).toBeNull();
  });

  it('keeps only the number of the last hold in localStorage', () => {
    const state = setup();
    state.saveLastNumber('H17');
    expect(localStorage.getItem(LAST_HOLD_KEY)).toBe('H17');
    expect(state.lastNumber()).toBe('H17');
  });

  it('does not touch localStorage on the server', () => {
    const state = setup('server');
    state.saveLastNumber('H17');
    expect(localStorage.getItem(LAST_HOLD_KEY)).toBeNull();
    expect(state.lastNumber()).toBeNull();
  });
});

describe('holdRequestFor (SR-223)', () => {
  const product = {
    id: '123', name: 'bra', nameRo: 'sutien', nameRu: 'бюстгальтер', price: 499, imageURL: 'a.jpg',
  } as Product;

  it('card id from `id`, localized and capitalized name, variant price wins', () => {
    expect(holdRequestFor(product, 'ru', 456, '75B', 399)).toEqual({
      productId: 123, variantAppId: 456, productName: 'Бюстгальтер', size: '75B', price: 399, imageUrl: 'a.jpg',
    });
    expect(holdRequestFor(product, 'ro', null, '', undefined)).toEqual(jasmine.objectContaining({
      productName: 'Sutien', size: null, price: 499, variantAppId: null,
    }));
  });

  it('no usable id → null', () => {
    expect(holdProductId({id: undefined, appId: undefined})).toBeNull();
    expect(holdProductId({id: 'abc'})).toBeNull();
    expect(holdRequestFor({...product, id: undefined}, 'ro', 1, 'S')).toBeNull();
  });
});
