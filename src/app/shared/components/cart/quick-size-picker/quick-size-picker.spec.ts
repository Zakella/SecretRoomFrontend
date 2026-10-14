import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideTransloco} from '@ngneat/transloco';
import {Language} from '../../../../@core/services/language';
import {QuickAddOption} from '../services/quick-add-resolver';
import {QuickAddPending, QuickAddToCart} from '../services/quick-add-to-cart';
import {QuickSizePicker} from './quick-size-picker';

describe('QuickSizePicker', () => {
  let fixture: ComponentFixture<QuickSizePicker>;
  const pending = signal<QuickAddPending | null>(null);
  const choose = jasmine.createSpy('choose');
  const close = jasmine.createSpy('close');
  const el = () => fixture.nativeElement as HTMLElement;
  const buttons = () => Array.from(el().querySelectorAll<HTMLButtonElement>('.size-btn'));

  beforeEach(async () => {
    choose.calls.reset();
    close.calls.reset();
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

    it('focuses the close button when every size is unavailable', () => {
      open([{size: '70A', variantAppId: 1, available: false}]);
      expect(document.activeElement).toBe(el().querySelector('.picker-close'));
    });
  });
});
