import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTransloco} from '@ngneat/transloco';
import {Language} from '../../../../@core/services/language';
import {QuickAddOption} from '../services/quick-add-resolver';
import {QuickAddPending, QuickAddToCart} from '../services/quick-add-to-cart';
import {QuickSizePicker} from './quick-size-picker';
import {StoreHoldState} from '../../../../widgets/store-hold/store-hold-state';

describe('QuickSizePicker', () => {
  let fixture: ComponentFixture<QuickSizePicker>;
  const pending = signal<QuickAddPending | null>(null);
  const choose = jasmine.createSpy('choose');
  const close = jasmine.createSpy('close');
  const holdDisabled = signal(false);
  const holdOpen = jasmine.createSpy('holdOpen');
  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.size-btn'));

  beforeEach(async () => {
    choose.calls.reset();
    close.calls.reset();
    holdOpen.calls.reset();
    holdDisabled.set(false);
    pending.set({
      product: {id: '1', name: 'Bra', imageURL: null} as never,
      options: [
        {size: '70A', variantAppId: 1, available: true},
        {size: '75B', variantAppId: 2, available: false},
      ],
    });
    await TestBed.configureTestingModule({
      imports: [QuickSizePicker],
      providers: [
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: QuickAddToCart, useValue: {pending: pending.asReadonly(), choose, close}},
        {provide: StoreHoldState, useValue: {disabled: holdDisabled.asReadonly(), open: holdOpen}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(QuickSizePicker);
    fixture.detectChanges();
  });

  it('is an accessible modal dialog', () => {
    const dialog = el().querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.hasAttribute('aria-label')).toBeTrue();
  });

  it('renders nothing when closed', () => {
    pending.set(null);
    fixture.detectChanges();
    expect(el().querySelector('.picker')).toBeNull();
  });

  it('unavailable size is disabled', () => {
    expect(buttons().map(b => b.disabled)).toEqual([false, true]);
  });

  it('click on an available size calls choose', () => {
    buttons()[0].click();
    expect(choose).toHaveBeenCalledWith(jasmine.objectContaining<QuickAddOption>({size: '70A', variantAppId: 1}));
  });

  it('Escape, close button and backdrop close it', () => {
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    expect(close).toHaveBeenCalledTimes(1);
    (el().querySelector('.picker-close') as HTMLButtonElement).click();
    (el().querySelector('.picker-backdrop') as HTMLElement).click();
    expect(close).toHaveBeenCalledTimes(3);
  });

  describe('focus', () => {
    const tab = (shiftKey = false) => {
      const e = new KeyboardEvent('keydown', {key: 'Tab', shiftKey, cancelable: true});
      document.dispatchEvent(e);
      return e;
    };
    let opener: HTMLButtonElement;

    beforeEach(() => {
      pending.set(null);
      fixture.detectChanges();
      opener = document.createElement('button');
      document.body.appendChild(opener);
      opener.focus();
    });

    afterEach(() => opener.remove());

    const open = (options: QuickAddOption[]) => {
      pending.set({product: {id: '1', name: 'Bra', imageURL: null} as never, options});
      fixture.detectChanges();
    };

    it('returns focus to the opening button when closed', () => {
      open([{size: '70A', variantAppId: 1, available: true}]);
      expect(document.activeElement).toBe(buttons()[0]);
      pending.set(null);
      fixture.detectChanges();
      expect(document.activeElement).toBe(opener);
    });

    it('does not focus an opener that has left the DOM', () => {
      open([{size: '70A', variantAppId: 1, available: true}]);
      opener.remove();
      pending.set(null);
      expect(() => fixture.detectChanges()).not.toThrow();
      expect(document.activeElement).not.toBe(opener);
    });

    it('Tab from the last size goes to the close button, Shift+Tab back goes to the last available size', () => {
      holdDisabled.set(true);
      open([
        {size: '70A', variantAppId: 1, available: true},
        {size: '75B', variantAppId: 2, available: true},
        {size: '80C', variantAppId: 3, available: false},
      ]);
      buttons()[1].focus();
      expect(tab().defaultPrevented).toBeTrue();
      const close = el().querySelector<HTMLButtonElement>('.picker-close')!;
      expect(document.activeElement).toBe(close);
      expect(tab(true).defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(buttons()[1]);
    });

    it('with hold available the "Hold in store" toggle closes the Tab loop', () => {
      open([
        {size: '70A', variantAppId: 1, available: true},
        {size: '75B', variantAppId: 2, available: true},
      ]);
      const toggle = el().querySelector<HTMLButtonElement>('.hold-toggle')!;
      toggle.focus();
      expect(tab().defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(el().querySelector('.picker-close'));
      expect(tab(true).defaultPrevented).toBeTrue();
      expect(document.activeElement).toBe(toggle);
    });

    it('focuses the close button when every size is unavailable', () => {
      open([{size: '70A', variantAppId: 1, available: false}]);
      expect(document.activeElement).toBe(el().querySelector('.picker-close'));
    });
  });

  describe('hold in store (SR-223)', () => {
    const toggle = () => el().querySelector<HTMLButtonElement>('.hold-toggle');
    const product = {id: '123', name: 'bra', nameRu: 'бюстгальтер', price: 499, imageURL: 'a.jpg',
      variants: [{appId: 1, size: '70A', price: 399}, {appId: 2, size: '75B'}]};

    beforeEach(() => {
      pending.set({
        product: product as never,
        options: [
          {size: '70A', variantAppId: 1, available: true},
          {size: '75B', variantAppId: 2, available: false},
          {size: '80C', available: true},
        ],
      });
      fixture.detectChanges();
    });

    it('offers the toggle; it is off by default and a size still goes to the cart', () => {
      expect(toggle()).not.toBeNull();
      expect(toggle()!.getAttribute('aria-pressed')).toBe('false');
      buttons()[0].click();
      expect(choose).toHaveBeenCalled();
      expect(holdOpen).not.toHaveBeenCalled();
    });

    it('in hold mode a size opens the hold dialog instead of the cart, and the panel closes first', () => {
      toggle()!.click();
      fixture.detectChanges();
      expect(toggle()!.getAttribute('aria-pressed')).toBe('true');
      expect(el().querySelector('.hint')!.textContent!.trim()).toBe('storeHold.chooseSizeToHold');
      buttons()[0].click();
      expect(choose).not.toHaveBeenCalled();
      expect(close).toHaveBeenCalled();
      expect(holdOpen).toHaveBeenCalledWith({
        productId: 123, variantAppId: 1, productName: 'Бюстгальтер', size: '70A', price: 399, imageUrl: 'a.jpg',
      });
    });

    it('in hold mode sold-out sizes and sizes without a variant cannot be held', () => {
      toggle()!.click();
      fixture.detectChanges();
      expect(buttons().map(b => b.disabled)).toEqual([false, true, true]);
    });

    it('no toggle when hold is switched off, the card is discontinued or nothing can be held', () => {
      holdDisabled.set(true);
      fixture.detectChanges();
      expect(toggle()).toBeNull();

      holdDisabled.set(false);
      pending.set({product: {...product, discontinued: true} as never, options: [{size: '70A', variantAppId: 1, available: true}]});
      fixture.detectChanges();
      expect(toggle()).toBeNull();

      pending.set({product: product as never, options: [{size: '70A', variantAppId: 1, available: false}, {size: '75B', available: true}]});
      fixture.detectChanges();
      expect(toggle()).toBeNull();
    });

    it('a new panel opens in the cart mode again', () => {
      toggle()!.click();
      fixture.detectChanges();
      pending.set(null);
      fixture.detectChanges();
      pending.set({product: product as never, options: [{size: '70A', variantAppId: 1, available: true}, {size: '75B', variantAppId: 2, available: true}]});
      fixture.detectChanges();
      expect(toggle()!.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
