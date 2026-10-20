import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {AddedToCartToast} from './added-to-cart';
import {AddedToCart} from '../services/added-to-cart';
import {CartItem} from '../../../../entities/cart-item';
import {Product} from '../../../../entities/product';
import {Size} from '../../../../entities/size';
import {Language} from '../../../../@core/services/language';
import {signal} from '@angular/core';

describe('AddedToCartToast', () => {
  let fixture: ComponentFixture<AddedToCartToast>;
  let state: AddedToCart;
  const el = () => fixture.nativeElement as HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddedToCartToast],
      providers: [
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(AddedToCartToast);
    state = TestBed.inject(AddedToCart);
    fixture.detectChanges();
  });

  afterEach(() => state.hide());

  function show(sizeType?: string) {
    const size = sizeType ? ({sizeType} as Size) : undefined;
    state.show(new CartItem({id: '1', name: 'Silk robe', price: 10} as Product, 1, size));
    fixture.detectChanges();
  }

  it('has a polite status live region and renders nothing when hidden', () => {
    const live = el().querySelector('[role="status"]')!;
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(el().querySelector('.added-toast')).toBeNull();
  });

  it('renders product name and size', () => {
    show('M');
    expect(el().querySelector('.name')!.textContent).toContain('Silk robe');
    expect(el().querySelector('.size')!.textContent).toContain('M');
  });

  it('omits size when absent', () => {
    show();
    expect(el().querySelector('.size')).toBeNull();
  });

  it('"continue shopping" closes it', () => {
    show();
    (el().querySelector('.btn-continue') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(el().querySelector('.added-toast')).toBeNull();
  });

  it('close button has an aria-label and closes it', () => {
    show();
    const btn = el().querySelector('.added-close') as HTMLButtonElement;
    expect(btn.hasAttribute('aria-label')).toBeTrue();
    btn.click();
    fixture.detectChanges();
    expect(el().querySelector('.added-toast')).toBeNull();
  });

  it('Escape closes it', () => {
    show();
    document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
    fixture.detectChanges();
    expect(el().querySelector('.added-toast')).toBeNull();
  });
});
