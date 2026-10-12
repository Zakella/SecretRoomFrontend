import {DOCUMENT} from '@angular/common';
import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {Subject} from 'rxjs';
import {environment} from '../../../environments/environment';
import {ProductSibling} from '../../entities/product-sibling';
import {MetaService} from './meta.service';
import {Slugify} from './slugify';

/**
 * SR-93: canonical карточки товара — её собственный адрес по appId, hreflang ro/ru/x-default не зависят
 * от siblings[] (остатки, current, порядок), а <head> обычной карточки (без siblings) не меняется.
 */
describe('MetaService: canonical и hreflang карточки товара', () => {
  const site = environment.frontend;
  let service: MetaService;
  let doc: Document;
  let routerUrl: string;
  let routerEvents: Subject<unknown>;
  const slugify = new Slugify();

  function sibling(appId: number, overrides: Partial<ProductSibling> = {}): ProductSibling {
    return {
      appId, name: `Bra ${appId}`, nameRu: `Бра ${appId}`, nameRo: `Bra ${appId}`,
      optionType: 'COLOR', optionLabelRu: 'Цвет', optionLabelRo: 'Culoare',
      swatchUrl: null, thumbnail: null, inStock: true, current: false, ...overrides,
    };
  }

  const baseProduct = () => ({
    id: '9', appId: '9', name: 'Master Bra', nameRo: 'Master Bra', nameRu: 'Мастер Бра',
    brandAlias: 'Nayomi', price: 100, imageURL: 'img/9.jpg', unitsInStock: 3, inStock: true,
    description: 'Desc', descriptionRo: 'Desc', descriptionRu: 'Описание',
  });

  function link(rel: string, hreflang?: string): string | null {
    const sel = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    return doc.querySelector(sel)?.getAttribute('href') ?? null;
  }

  /** Всё, что SEO-эпик считает «головой» карточки: canonical, hreflang, title, description, og, JSON-LD. */
  function headSignature(): Record<string, unknown> {
    const metaContent = (sel: string) => doc.querySelector(sel)?.getAttribute('content') ?? null;
    return {
      canonical: link('canonical'),
      ro: link('alternate', 'ro'),
      ru: link('alternate', 'ru'),
      xDefault: link('alternate', 'x-default'),
      alternates: doc.querySelectorAll('link[rel="alternate"]').length,
      title: doc.title,
      description: metaContent('meta[name="description"]'),
      ogUrl: metaContent('meta[property="og:url"]'),
      ogTitle: metaContent('meta[property="og:title"]'),
      ogImage: metaContent('meta[property="og:image"]'),
      ldJson: doc.querySelector('script[data-schema="product"]')?.textContent?.replace(/"priceValidUntil":"[^"]*"/, '') ?? null,
    };
  }

  /** То, что делает приложение: setProductMeta на карточке + canonical по адресу после навигации. */
  function renderProduct(product: object, lang = 'ro') {
    service.setProductMeta(product, lang, slugify);
    service.updateCanonicalUrl();
  }

  beforeEach(() => {
    routerUrl = '/ro/product/9/master-bra';
    routerEvents = new Subject();
    TestBed.configureTestingModule({
      providers: [{provide: Router, useValue: {get url() { return routerUrl; }, events: routerEvents}}],
    });
    service = TestBed.inject(MetaService);
    doc = TestBed.inject(DOCUMENT);
    doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[data-schema="product"]').forEach(e => e.remove());
  });

  afterEach(() => {
    doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"], script[data-schema="product"]').forEach(e => e.remove());
  });

  it('canonical — собственный адрес карточки по appId, hreflang ro/ru/x-default', () => {
    renderProduct(baseProduct());
    expect(link('canonical')).toBe(`${site}/ro/product/9/master-bra`);
    expect(link('alternate', 'ro')).toBe(`${site}/ro/product/9/master-bra`);
    expect(link('alternate', 'ru')).toBe(`${site}/ru/product/9/master-bra`);
    expect(link('alternate', 'x-default')).toBe(`${site}/ro/product/9/master-bra`);
  });

  it('canonical без ?size= и ?variant= (и без #fragment)', () => {
    routerUrl = '/ru/product/9/master-bra?size=M&variant=77#reviews';
    renderProduct(baseProduct(), 'ru');
    expect(link('canonical')).toBe(`${site}/ru/product/9/master-bra`);
    expect(link('canonical')).not.toContain('?');
    expect(doc.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it('canonical и hreflang не зависят от siblings: inStock, current, остатки и порядок соседей', () => {
    renderProduct(baseProduct());
    const plain = headSignature();

    const variants: ProductSibling[][] = [
      [sibling(9, {current: true}), sibling(10), sibling(11)],
      [sibling(11), sibling(10, {inStock: false}), sibling(9, {current: true, inStock: false})],
      [sibling(10, {inStock: false}), sibling(11, {inStock: false}), sibling(9, {current: true})],
      [sibling(9, {current: true}), sibling(12, {name: 'Другое имя'})],
    ];
    for (const [index, siblings] of variants.entries()) {
      renderProduct({...baseProduct(), siblings, optionType: 'COLOR', optionCount: siblings.length});
      const sig = headSignature();
      expect(sig['canonical']).withContext(`#${index} canonical`).toBe(plain['canonical']);
      expect(sig['ro']).withContext(`#${index} ro`).toBe(plain['ro']);
      expect(sig['ru']).withContext(`#${index} ru`).toBe(plain['ru']);
      expect(sig['xDefault']).withContext(`#${index} x-default`).toBe(plain['xDefault']);
      expect(sig['alternates']).withContext(`#${index} alternates`).toBe(3);
    }

    // остатки самой карточки меняют только availability в JSON-LD, но не canonical/hreflang
    renderProduct({...baseProduct(), unitsInStock: 0, inStock: false, siblings: variants[0]});
    expect(link('canonical')).toBe(plain['canonical'] as string);
    expect(link('alternate', 'ru')).toBe(plain['ru'] as string);
  });

  it('<head> обычной карточки (без siblings) не меняется: повторный рендер даёт тот же результат, поля зафиксированы', () => {
    renderProduct(baseProduct());
    const first = headSignature();
    renderProduct({...baseProduct(), siblings: undefined, optionCount: undefined});
    expect(headSignature()).toEqual(first);

    // «снимок до»: значения зафиксированы по фактическому выводу setProductMeta до SR-93
    expect(first['canonical']).toBe(`${site}/ro/product/9/master-bra`);
    expect(first['title']).toBe('Master Bra Nayomi - Preț Moldova | Secret Room');
    expect(first['description']).toBe('Cumpără Master Bra de la Nayomi în Moldova. Desc. Livrare rapidă în Chișinău.');
    expect(first['ogUrl']).toBe(`${site}/ro/product/9/master-bra`);
    expect(first['ogImage']).toBe('img/9.jpg');
    expect(first['alternates']).toBe(3);
  });
});
