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
});
