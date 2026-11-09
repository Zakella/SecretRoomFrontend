import {signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco, TranslocoService} from '@ngneat/transloco';
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

  describe('promotion badge (SR-240)', () => {
    const percent = {id: 1, type: 'PERCENT', percent: 20, nth: null, buy: null, free: null, onlineOnly: false};
    const el = () => fixture.nativeElement as HTMLElement;
    const badges = () => Array.from(el().querySelectorAll('promo-badge')) as HTMLElement[];

    function item(overrides: Partial<Product> = {}): Product {
      return {id: '1', name: 'Item', price: 100, unitsInStock: 5, ...overrides} as Product;
    }

    it('should show the label of PERCENT, NTH_PERCENT and BUY_X_GET_Y', () => {
      render([
        item({id: '1', promotions: [percent]}),
        item({id: '2', promotions: [{...percent, type: 'NTH_PERCENT', percent: 50, nth: 2}]}),
        item({id: '3', promotions: [{...percent, type: 'BUY_X_GET_Y', percent: null, buy: 2, free: 1}]}),
      ]);
      expect(badges().map(b => b.textContent!.trim())).toEqual(['−20%', 'Al 2-lea produs −50%', '2+1 cadou']);
    });

    it('should show the label in ru', () => {
      currentLanguage.set('ru');
      TestBed.inject(TranslocoService).setActiveLang('ru');
      render([item({promotions: [{...percent, type: 'NTH_PERCENT', percent: 50, nth: 2}]})]);
      expect(badges().map(b => b.textContent!.trim())).toEqual(['2-й товар −50%']);
    });

    it('should take the first promotion only', () => {
      render([item({promotions: [{...percent, percent: 30}, {...percent, id: 2, percent: 10}]})]);
      expect(badges().length).toBe(1);
      expect(badges()[0].textContent).toContain('30');
    });

    it('should show no badge without promotions and keep the plain card', () => {
      render([item({id: '1'}), item({id: '2', promotions: []})]);
      expect(badges().length).toBe(0);
      expect(el().querySelector('.promo-online-only')).toBeNull();
      expect(cards().length).toBe(2);
    });

    it('should show no badge for an out of stock product', () => {
      render([item({unitsInStock: 0, promotions: [{...percent, onlineOnly: true}]})]);
      expect(badges().length).toBe(0);
      expect(el().querySelector('.promo-online-only')).toBeNull();
    });

    it('should show no badge and not fail when the promotion has no label', () => {
      render([
        item({id: '1', promotions: [{...percent, percent: 0}]}),
        item({id: '2', promotions: [{...percent, type: 'UNKNOWN'}]}),
      ]);
      expect(badges().length).toBe(0);
      expect(cards().length).toBe(2);
    });

    it('should note "online only" under the price', () => {
      render([item({id: '1', promotions: [{...percent, onlineOnly: true}]}), item({id: '2', promotions: [percent]})]);
      const notes = Array.from(el().querySelectorAll('.promo-online-only'));
      expect(notes.map(n => n.textContent!.trim())).toEqual(['doar online']);
      expect(notes[0].previousElementSibling!.tagName).toBe('PRODUCT-PRICE');
    });
  });
});
