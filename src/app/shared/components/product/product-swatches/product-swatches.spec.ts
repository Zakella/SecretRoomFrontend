import {PLATFORM_ID, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../../@core/configs/transloco-config';
import {Language} from '../../../../@core/services/language';
import {ProductSibling} from '../../../../entities/product-sibling';
import {optionTypeLabelKey, ProductSwatches} from './product-swatches';

function sibling(overrides: Partial<ProductSibling> = {}): ProductSibling {
  return {
    appId: 1, name: 'Bra Red', nameRu: 'Бра красный', nameRo: 'Bra rosu',
    optionType: 'COLOR', optionLabelRu: 'Красный', optionLabelRo: 'Rosu',
    swatchUrl: null, thumbnail: 'img/1.jpg', inStock: true, current: false,
    ...overrides
  };
}

const THREE: ProductSibling[] = [
  sibling({appId: 1, name: 'Bra Red', current: true}),
  sibling({appId: 2, name: 'Bra Blue', optionLabelRu: 'Синий', optionLabelRo: 'Albastru'}),
  sibling({appId: 3, name: 'Bra Black', optionLabelRu: 'Чёрный', optionLabelRo: 'Negru', inStock: false}),
];

describe('ProductSwatches', () => {
  let fixture: ComponentFixture<ProductSwatches>;
  const currentLanguage = signal('ru');

  beforeEach(() => {
    currentLanguage.set('ru');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({
          config: {availableLangs: ['ro', 'ru'], defaultLang: 'ru'},
          loader: TranslocateHttpLoader,
        }),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: Language, useValue: {currentLanguage}},
      ],
    });
    fixture = TestBed.createComponent(ProductSwatches);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).match(() => true);
  });

  function render(siblings: ProductSibling[] | null | undefined, extra: {optionType?: string; size?: string} = {}) {
    fixture.componentRef.setInput('siblings', siblings);
    fixture.componentRef.setInput('optionType', extra.optionType);
    fixture.componentRef.setInput('selectedSize', extra.size);
    fixture.detectChanges();
  }

  const el = () => fixture.nativeElement as HTMLElement;

  it('скрыт при undefined, [] и одном элементе: ни разметки', () => {
    for (const value of [undefined, null, [], [sibling({current: true})]]) {
      render(value);
      expect(el().querySelector('.product-swatches')).toBeNull();
      expect(el().innerHTML.replace(/<!--.*?-->/g, '').trim()).toBe('');
    }
  });

  it('3 элемента: 3 свотча, aria-current только у current, current не ссылка', () => {
    render(THREE);
    expect(el().querySelectorAll('.swatch').length).toBe(3);
    const current = el().querySelectorAll('[aria-current="true"]');
    expect(current.length).toBe(1);
    expect(current[0].tagName).toBe('SPAN');
    expect(el().querySelectorAll('a.swatch').length).toBe(2);
  });

  it('inStock=false: класс перечёркивания, подпись и title, ссылка остаётся', () => {
    render(THREE);
    const out = el().querySelector('.swatch.out-of-stock') as HTMLAnchorElement;
    expect(out).not.toBeNull();
    expect(out.tagName).toBe('A');
    expect(out.getAttribute('href')).toContain('/ru/product/3/bra-black');
    expect(out.getAttribute('title')).toContain('Чёрный');
    expect(out.querySelector('.visually-hidden')).not.toBeNull();
    expect(el().querySelectorAll('.swatch.out-of-stock').length).toBe(1);
  });

  it('href соседа для ru и ro', () => {
    render(THREE);
    expect((el().querySelectorAll('a.swatch')[0] as HTMLAnchorElement).getAttribute('href')).toBe('/ru/product/2/bra-blue');
    currentLanguage.set('ro');
    fixture.detectChanges();
    expect((el().querySelectorAll('a.swatch')[0] as HTMLAnchorElement).getAttribute('href')).toBe('/ro/product/2/bra-blue');
    expect(el().querySelectorAll('.swatch-caption')[1].textContent).toContain('Albastru');
  });

  it('переносит выбранный размер в ?size=, без размера параметра нет', () => {
    render(THREE, {size: 'M'});
    expect((el().querySelector('a.swatch') as HTMLAnchorElement).getAttribute('href')).toContain('size=M');
    render(THREE, {size: undefined});
    expect((el().querySelector('a.swatch') as HTMLAnchorElement).getAttribute('href')).not.toContain('size=');
  });

  it('thumbnail рисуется с заданными размерами, без него только рамка', () => {
    render([sibling({appId: 1, current: true}), sibling({appId: 2, thumbnail: null})]);
    const imgs = el().querySelectorAll('img.swatch-img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('width')).toBe('52');
  });

  it('a11y: список связан с подписью типа через aria-labelledby, id уникален между экземплярами', () => {
    render(THREE);
    const list = el().querySelector('ul.swatches-list') as HTMLElement;
    const labelId = list.getAttribute('aria-labelledby');
    expect(labelId).toBeTruthy();
    const label = el().querySelector(`#${labelId}`) as HTMLElement;
    expect(label).not.toBeNull();
    expect(label.classList.contains('swatches-label')).toBeTrue();
    expect(label.textContent).toContain(':');

    const second = TestBed.createComponent(ProductSwatches);
    second.componentRef.setInput('siblings', THREE);
    second.detectChanges();
    const secondId = (second.nativeElement as HTMLElement).querySelector('ul.swatches-list')!.getAttribute('aria-labelledby');
    expect(secondId).toBeTruthy();
    expect(secondId).not.toBe(labelId);
  });

  it('подпись типа по optionType', () => {
    expect(optionTypeLabelKey('COLOR')).toBe('OptionTypeColor');
    expect(optionTypeLabelKey('SCENT')).toBe('OptionTypeScent');
    expect(optionTypeLabelKey('SHADE')).toBe('OptionTypeShade');
    expect(optionTypeLabelKey('OTHER')).toBe('OptionTypeVariant');
    expect(optionTypeLabelKey(null)).toBe('OptionTypeVariant');
    expect(optionTypeLabelKey(undefined)).toBe('OptionTypeVariant');
  });
});
