import {PLATFORM_ID, signal} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco, TranslocoService} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../../@core/configs/transloco-config';
import {BrandService} from '../../../../@core/api/brand';
import {Language} from '../../../../@core/services/language';
import {Brand} from '../../../../entities/category';
import {Product} from '../../../../entities/product';
import {QuickAddToCart} from '../../cart/services/quick-add-to-cart';
import {ProductCard} from './product-card';

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'AnnSummers', brandAlias: 'Ann Summers'},
];

function product(overrides: Partial<Product> = {}): Product {
  return {id: '42', name: 'Cool Product', ...overrides} as Product;
}

describe('ProductCard', () => {
  let fixture: ComponentFixture<ProductCard>;
  let component: ProductCard;
  let brandService: BrandService;
  const currentLanguage = signal('ro');

  beforeEach(() => {
    localStorage.clear();
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
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: Language, useValue: {currentLanguage}},
      ],
    });

    fixture = TestBed.createComponent(ProductCard);
    component = fixture.componentInstance;
    brandService = TestBed.inject(BrandService);
    brandService.brands.set(BRANDS);
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  function setProduct(p: Product | undefined): void {
    fixture.componentRef.setInput('product', p);
  }

  describe('brandUrl', () => {
    it('should be null when there is no product', () => {
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null when the product carries no brand alias', () => {
      setProduct(product({brandAlias: undefined}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null when the brand list has not been loaded', () => {
      brandService.brands.set([]);
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should be null for a brand that is not in the catalog', () => {
      setProduct(product({brandAlias: 'Nayomi'}));
      expect(component.brandUrl()).toBeNull();
    });

    it('should build the brand catalog link from the alias', () => {
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toEqual(['/', 'ro', 'catalog', 'brand', 'victorias-secret']);
    });

    it('should follow the active language', () => {
      setProduct(product({brandAlias: 'Ann Summers'}));
      currentLanguage.set('ru');
      expect(component.brandUrl()).toEqual(['/', 'ru', 'catalog', 'brand', 'ann-summers']);
    });

    it('should recompute when the brand list arrives after the product', () => {
      brandService.brands.set([]);
      setProduct(product({brandAlias: "Victoria's Secret"}));
      expect(component.brandUrl()).toBeNull();

      brandService.brands.set(BRANDS);
      expect(component.brandUrl()).toEqual(['/', 'ro', 'catalog', 'brand', 'victorias-secret']);
    });
  });

  describe('brand link rendering', () => {
    it('should render the brand as an anchor with a real href', () => {
      setProduct(product({brandAlias: "Victoria's Secret"}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();

      const link = fixture.nativeElement.querySelector('a.brand-link') as HTMLAnchorElement;
      expect(link).not.toBeNull();
      expect(link.getAttribute('href')).toBe('/ro/catalog/brand/victorias-secret');
    });

    it('should fall back to plain text when the brand cannot be resolved', () => {
      setProduct(product({brandAlias: 'Nayomi'}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('a.brand-link')).toBeNull();
      expect(fixture.nativeElement.querySelector('.brand-name')!.textContent!.trim()).toBe('Nayomi');
    });
  });

  describe('«+N» вариантов модели', () => {
    function render(p: Partial<Product>, lang: 'ro' | 'ru' = 'ro'): HTMLElement | null {
      currentLanguage.set(lang);
      TestBed.inject(TranslocoService).setActiveLang(lang);
      setProduct(product(p));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('.more-options');
    }
    const text = (el: HTMLElement | null) => el?.textContent?.trim();

    it('нет плашки и нет разметки при optionCount null, undefined, 0, 1', () => {
      for (const optionCount of [undefined, null as unknown as number, 0, 1]) {
        expect(render({optionCount, optionType: 'COLOR'})).withContext(String(optionCount)).toBeNull();
      }
    });

    it('ru: тип и склонение (optionCount - 1)', () => {
      expect(text(render({optionCount: 2, optionType: 'COLOR'}, 'ru'))).toBe('+1 цвет');
      expect(text(render({optionCount: 4, optionType: 'COLOR'}, 'ru'))).toBe('+3 цвета');
      expect(text(render({optionCount: 6, optionType: 'COLOR'}, 'ru'))).toBe('+5 цветов');
      expect(text(render({optionCount: 12, optionType: 'COLOR'}, 'ru'))).toBe('+11 цветов');
      expect(text(render({optionCount: 22, optionType: 'COLOR'}, 'ru'))).toBe('+21 цвет');
      expect(text(render({optionCount: 4, optionType: 'SCENT'}, 'ru'))).toBe('+3 аромата');
      expect(text(render({optionCount: 4, optionType: 'SHADE'}, 'ru'))).toBe('+3 оттенка');
    });

    it('ro: тип и склонение, 20+ с «de»', () => {
      expect(text(render({optionCount: 2, optionType: 'COLOR'}))).toBe('+1 culoare');
      expect(text(render({optionCount: 4, optionType: 'COLOR'}))).toBe('+3 culori');
      expect(text(render({optionCount: 20, optionType: 'COLOR'}))).toBe('+19 culori');
      expect(text(render({optionCount: 21, optionType: 'COLOR'}))).toBe('+20 de culori');
      expect(text(render({optionCount: 4, optionType: 'SCENT'}))).toBe('+3 arome');
      expect(text(render({optionCount: 4, optionType: 'SHADE'}))).toBe('+3 nuanțe');
    });

    it('optionType null — нейтральное «варианта» (ru)', () => {
      expect(text(render({optionCount: 4, optionType: undefined}, 'ru'))).toBe('+3 варианта');
    });

    it('optionType неизвестный — нейтральное «opțiuni» (ro)', () => {
      expect(text(render({optionCount: 4, optionType: 'MYSTERY'}))).toBe('+3 opțiuni');
    });

    it('плашка лежит внутри image-wrapper (поверх фото, вне потока)', () => {
      const el = render({optionCount: 3, optionType: 'COLOR'})!;
      expect(el.parentElement!.classList.contains('image-wrapper')).toBeTrue();
    });
  });

  describe('галерея фото', () => {
    const img = (imageUrl: string) => ({imageUrl}) as never;

    function renderGallery(main: string, urls: string[], visible = true): HTMLElement {
      fixture.componentRef.setInput('imageUrl', main);
      setProduct(product({productImagesWebStore: urls.map(img)}));
      fixture.componentRef.setInput('price', 100);
      component.imagesVisible.set(visible);
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('images: imageUrl первым, дубли и пустые отброшены, порядок сохранён', () => {
      fixture.componentRef.setInput('imageUrl', 'b.jpg');
      setProduct(product({productImagesWebStore: [img('a.jpg'), img('b.jpg'), img(''), img('c.jpg'), img('a.jpg')]}));
      expect(component.images()).toEqual(['b.jpg', 'a.jpg', 'c.jpg']);
    });

    it('одно фото: нет стрелок и точек', () => {
      const el = renderGallery('a.jpg', ['a.jpg']);
      expect(el.querySelectorAll('.nav').length).toBe(0);
      expect(el.querySelectorAll('.dot').length).toBe(0);
      expect(el.querySelectorAll('.gallery-track img').length).toBe(1);
    });

    it('5 фото: 5 точек, первая активна, 2 стрелки', () => {
      const el = renderGallery('1.jpg', ['1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg']);
      const dots = el.querySelectorAll('.dot');
      expect(dots.length).toBe(5);
      expect(dots[0].classList.contains('active')).toBeTrue();
      expect(el.querySelectorAll('.dot.active').length).toBe(1);
      expect(el.querySelectorAll('.nav').length).toBe(2);
      expect(el.querySelectorAll('.gallery-track img').length).toBe(5);
    });

    it('9 фото: 5 точек, первая активна, последняя edge', () => {
      const urls = Array.from({length: 9}, (_, k) => `${k}.jpg`);
      const el = renderGallery('0.jpg', urls);
      const dots = el.querySelectorAll('.dot');
      expect(dots.length).toBe(5);
      expect(dots[0].classList.contains('active')).toBeTrue();
      expect(dots[4].classList.contains('edge')).toBeTrue();
      expect(el.querySelectorAll('.dot.edge').length).toBe(1);

      component.selectImage(8, el.querySelector('.gallery-track') as HTMLElement);
      fixture.detectChanges();
      expect(component.visibleDots()).toEqual([4, 5, 6, 7, 8]);
      const after = el.querySelectorAll('.dot');
      expect(after[4].classList.contains('active')).toBeTrue();
      expect(after[0].classList.contains('edge')).toBeTrue();
    });

    it('3 фото: 3 точки без edge', () => {
      const el = renderGallery('1.jpg', ['1.jpg', '2.jpg', '3.jpg']);
      expect(el.querySelectorAll('.dot').length).toBe(3);
      expect(el.querySelectorAll('.dot.edge').length).toBe(0);
    });

    it('пока карточка не в зоне видимости — только первое фото', () => {
      const el = renderGallery('1.jpg', ['1.jpg', '2.jpg', '3.jpg'], false);
      expect(el.querySelectorAll('.gallery-track img').length).toBe(1);
      expect(el.querySelectorAll('.dot').length).toBe(0);
    });

    it('клик по стрелке и точке не всплывает и не переходит по ссылке', () => {
      const el = renderGallery('1.jpg', ['1.jpg', '2.jpg', '3.jpg']);
      const targets = [el.querySelector('.nav-next')!, el.querySelector('.nav-prev')!, el.querySelectorAll('.dot')[1]];
      for (const target of targets) {
        const event = new MouseEvent('click', {bubbles: true, cancelable: true});
        const prevent = spyOn(event, 'preventDefault').and.callThrough();
        const stop = spyOn(event, 'stopPropagation').and.callThrough();
        target.dispatchEvent(event);
        expect(prevent).toHaveBeenCalled();
        expect(stop).toHaveBeenCalled();
      }
    });

    it('клик по точке выбирает фото', () => {
      const el = renderGallery('1.jpg', ['1.jpg', '2.jpg', '3.jpg']);
      (el.querySelectorAll('.dot')[2] as HTMLElement).click();
      fixture.detectChanges();
      expect(component.selectedImageIndex()).toBe(2);
      expect(el.querySelectorAll('.dot')[2].classList.contains('active')).toBeTrue();
    });
  });

  describe('галерея фото на сервере (SSR)', () => {
    it('рендерится только первое фото', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          provideHttpClient(),
          provideHttpClientTesting(),
          provideRouter([]),
          provideTransloco({
            config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
            loader: TranslocateHttpLoader,
          }),
          {provide: PLATFORM_ID, useValue: 'server'},
          {provide: Language, useValue: {currentLanguage}},
        ],
      });
      const serverFixture = TestBed.createComponent(ProductCard);
      serverFixture.componentRef.setInput('imageUrl', '1.jpg');
      serverFixture.componentRef.setInput('product', product({productImagesWebStore: [{imageUrl: '2.jpg'}, {imageUrl: '3.jpg'}] as never}));
      serverFixture.componentRef.setInput('price', 100);
      serverFixture.detectChanges();

      const el = serverFixture.nativeElement as HTMLElement;
      expect(el.querySelectorAll('.gallery-track img').length).toBe(1);
      expect(el.querySelectorAll('.dot').length).toBe(0);
      expect(serverFixture.componentInstance.imagesVisible()).toBeFalse();
    });
  });

  describe('плашки остатка', () => {
    it('unitsInStock=2 без variants: плашка «мало на складе» не рендерится', () => {
      setProduct(product({unitsInStock: 2, variants: undefined}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.badge-low-stock')).toBeNull();
    });

    it('unitsInStock=1 без variants: бейджа «Последний» нет (остаток — только на странице товара)', () => {
      setProduct(product({unitsInStock: 1, variants: undefined}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.badge-last-item')).toBeNull();
    });
  });

  describe('quick add loading state', () => {
    function addButton(): HTMLButtonElement {
      setProduct(product({unitsInStock: 5}));
      fixture.componentRef.setInput('price', 100);
      fixture.detectChanges();
      return fixture.nativeElement.querySelector('.add-to-bag-btn');
    }

    it('button stays focusable but aria-disabled and aria-busy while the card is loading', () => {
      spyOn(TestBed.inject(QuickAddToCart), 'isLoading').and.returnValue(true);
      const btn = addButton();
      // Not `disabled`: the browser would drop focus and the size picker could not return it.
      expect(btn.disabled).toBeFalse();
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.getAttribute('aria-busy')).toBe('true');
      expect(btn.classList).toContain('is-loading');
    });

    it('button is active when nothing is loading', () => {
      const btn = addButton();
      expect(btn.disabled).toBeFalse();
      expect(btn.hasAttribute('aria-busy')).toBeFalse();
      expect(btn.hasAttribute('aria-disabled')).toBeFalse();
    });
  });
});
