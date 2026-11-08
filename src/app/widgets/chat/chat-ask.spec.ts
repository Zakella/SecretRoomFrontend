import {TestBed} from '@angular/core/testing';
import {ChatAsk, ChatProductDraft} from './chat-ask';

const BRA: ChatProductDraft = {productId: 12, name: 'Bra', price: 900, oldPrice: 1200, imageUrl: 'https://api.md/a.jpg'};

describe('ChatAsk (SR-220: «Спросить в чате»)', () => {
  let ask: ChatAsk;

  beforeEach(() => {
    ask = TestBed.inject(ChatAsk);
  });

  it('a request waits until the widget takes it, then is gone', () => {
    expect(ask.request()).toBeNull();
    ask.ask(BRA);
    expect(ask.request()).toEqual(BRA);
    expect(ask.take()).toEqual(BRA);
    expect(ask.request()).toBeNull();
    expect(ask.take()).toBeNull();
  });

  it('the latest request wins; the same product again is a new request', () => {
    ask.ask(BRA);
    ask.ask({...BRA, productId: 13});
    expect(ask.take()?.productId).toBe(13);
    const first = ask.request();
    ask.ask(BRA);
    const second = ask.request();
    ask.ask(BRA);
    expect(ask.request()).not.toBe(second);
    expect(first).toBeNull();
  });

  it('keeps a copy: later changes of the caller object do not leak in', () => {
    const p = {...BRA};
    ask.ask(p);
    p.name = 'changed';
    expect(ask.take()?.name).toBe('Bra');
  });

  it('ignores a product without a valid id', () => {
    ask.ask({...BRA, productId: 0});
    ask.ask({...BRA, productId: -1});
    ask.ask({...BRA, productId: 1.5});
    ask.ask({...BRA, productId: NaN});
    expect(ask.request()).toBeNull();
  });

  it('chat switched off: not available, pending request dropped, new ones ignored', () => {
    expect(ask.available()).toBeTrue();
    ask.ask(BRA);
    ask.disable();
    expect(ask.available()).toBeFalse();
    expect(ask.request()).toBeNull();
    ask.ask(BRA);
    expect(ask.request()).toBeNull();
  });

  describe('SR-238: «Написать в чат» (open without a product)', () => {
    it('open() puts a request, takeOpen() takes it once', () => {
      expect(ask.openRequested()).toBeFalse();
      expect(ask.takeOpen()).toBeFalse();
      ask.open();
      expect(ask.openRequested()).toBeTrue();
      expect(ask.takeOpen()).toBeTrue();
      expect(ask.openRequested()).toBeFalse();
      expect(ask.takeOpen()).toBeFalse();
    });

    it('does not touch a product request', () => {
      ask.ask(BRA);
      ask.open();
      expect(ask.takeOpen()).toBeTrue();
      expect(ask.request()).toEqual(BRA);
    });

    it('chat switched off: pending request dropped, new ones ignored', () => {
      ask.open();
      ask.disable();
      expect(ask.openRequested()).toBeFalse();
      ask.open();
      expect(ask.openRequested()).toBeFalse();
      expect(ask.takeOpen()).toBeFalse();
    });
  });
});
