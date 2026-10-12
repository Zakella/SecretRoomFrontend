import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../../@core/configs/transloco-config';
import {Language} from '../../../../@core/services/language';
import {Product} from '../../../../entities/product';
import {NewArrivals} from './new-arrivals';

// Слаг считается от name || nameRo — так же, как на сервере (server.ts, productSlugs),
// иначе клик по карточке получал бы 301 на канонический адрес.
const PRODUCTS: Product[] = [
  {id: '101', name: 'Lace Bra Set', nameRo: 'Set sutien dantela', price: 500} as Product,
  {id: '202', name: '', nameRo: 'Cămașă de noapte', price: 300, oldPrice: 600} as Product,
];

describe('NewArrivals', () => {
  let fixture: ComponentFixture<NewArrivals>;
  const currentLanguage = signal('ro');

  function cards(): HTMLAnchorElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('a.product-card')) as HTMLAnchorElement[];
  }

  function render(products: Product[] = PRODUCTS): void {
    fixture.componentRef.setInput('newArrivals', products);
    fixture.detectChanges();
  }

  beforeEach(() => {
    currentLanguage.set('ro');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({
          config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
          loader: TranslocateHttpLoader,
        }),
        {provide: Language, useValue: {currentLanguage}},
      ],
    });

    fixture = TestBed.createComponent(NewArrivals);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('should render every product card as a real anchor', () => {
    render();
    const links = cards();
    expect(links.length).toBe(2);
    for (const link of links) {
      expect(link.tagName).toBe('A');
      expect(link.getAttribute('href')).toBeTruthy();
    }
  });

  it('should link cards to the canonical /:lang/product/:id/:slug URL', () => {
    render();
    expect(cards().map(a => a.getAttribute('href'))).toEqual([
      '/ro/product/101/lace-bra-set',
      '/ro/product/202/camasa-de-noapte',
    ]);
  });

  it('should build hrefs for the active language', () => {
    currentLanguage.set('ru');
    render();
    expect(cards().map(a => a.getAttribute('href'))).toEqual([
      '/ru/product/101/lace-bra-set',
      '/ru/product/202/camasa-de-noapte',
    ]);
  });

  it('should not link to the legacy product-detail route', () => {
    render();
    const hrefs = Array.from(fixture.nativeElement.querySelectorAll('a[href]'))
      .map(a => (a as HTMLAnchorElement).getAttribute('href'));
    expect(hrefs.some(h => h!.includes('product-detail'))).toBeFalse();
  });

  it('should keep the active class on the current slide', () => {
    render();
    const [first, second] = cards();
    expect(first.classList).toContain('active');
    expect(second.classList).not.toContain('active');
  });
});
