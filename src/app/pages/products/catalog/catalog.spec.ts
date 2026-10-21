import {Signal, signal, WritableSignal} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {DOCUMENT, Location} from '@angular/common';
import {provideLocationMocks} from '@angular/common/testing';
import {HttpRequest, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, TestRequest, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {RouterTestingHarness} from '@angular/router/testing';
import {provideNoopAnimations} from '@angular/platform-browser/animations';
import {parseCatalogPage} from '../../../@core/services/catalog-page';
import {Meta} from '@angular/platform-browser';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../@core/configs/transloco-config';
import {ProductService} from '../../../@core/api/product';
import {Language} from '../../../@core/services/language';
import {Brand} from '../../../entities/category';
import {BRAND_SEO, BrandSeoLocale} from '../../../@core/configs/brand-seo';
import {FilterGroup} from '../../../entities/filter-group';
import {Catalog} from './catalog';
import {FilterSectionView} from './catalog-filters.util';

/** brandSlugValue/brandSeo/otherBrands объявлены protected — тест смотрит на них напрямую. */
interface CatalogInternals {
  brandName: WritableSignal<string | null>;
  allBrands: WritableSignal<Brand[]>;
  brandSlugValue: Signal<string | null>;
  brandSeo: Signal<BrandSeoLocale | null>;
  otherBrands: Signal<{slug: string, label: string}[]>;
  availableFilters: WritableSignal<FilterGroup[]>;
  sections: Signal<FilterSectionView[]>;
  toggleSection(section: FilterSectionView): void;
  toggleExpanded(key: string): void;
  pinOpen(key: string): void;
  activeChips: Signal<{kind: string; group?: FilterGroup; value?: unknown; label?: string}[]>;
  products: WritableSignal<unknown[]>;
  isLoading: Signal<boolean>;
  selectedFilters: Signal<Map<string, Set<string>>>;
  selectBrand(brand: string | null): void;
  fetchProducts(append?: boolean): void;
  currentCategoryId: string | null;
  pendingFilters: WritableSignal<Map<string, Set<string>>>;
  setCategory(tag: string): void;
  toggleFilter(group: string, value: string): void;
  clearAllFilters(): void;
  openFilterDrawer(): void;
  togglePendingFilter(group: string, value: string): void;
  applyFiltersAndClose(): void;
  selectPendingBrand(brand: string | null): void;
  clearPendingFilters(): void;
  onFilterDrawerHide(): void;
  drawerSections: Signal<FilterSectionView[]>;
  updateRobots(tag: string | null): void;
  ngOnDestroy(): void;
}

const BRANDS: Brand[] = [
  {brand: 'VictoriasSecret', brandAlias: "Victoria's Secret"},
  {brand: 'BathAndBody', brandAlias: 'Bath & Body Works'},
  {brand: 'AnnSummers', brandAlias: ''},
];

describe('Catalog', () => {
  let catalog: CatalogInternals;
  const currentLanguage = signal('ro');

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
        ProductService,
        Catalog,
      ],
    });

    catalog = TestBed.inject(Catalog) as unknown as CatalogInternals;
  });

  describe('brandSlugValue', () => {
    it('should be null outside a brand page', () => {
      expect(catalog.brandSlugValue()).toBeNull();
    });

    it('should slugify the brand key', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.brandSlugValue()).toBe('victorias-secret');
    });
  });

  describe('brandSeo', () => {
    it('should be null outside a brand page', () => {
      expect(catalog.brandSeo()).toBeNull();
    });

    it('should be null for a brand without hand-written copy (generic template takes over)', () => {
      catalog.brandName.set('Nayomi');
      expect(catalog.brandSeo()).toBeNull();
    });

    it('should return the Romanian copy of the current brand', () => {
      catalog.brandName.set('AnnSummers');
      expect(catalog.brandSeo()).toBe(BRAND_SEO['ann-summers'].ro);
    });

    it('should follow the active language', () => {
      catalog.brandName.set('AnnSummers');
      currentLanguage.set('ru');
      expect(catalog.brandSeo()).toBe(BRAND_SEO['ann-summers'].ru);
    });
  });

  describe('filter accordion', () => {
    const manyValues = (n: number) => Array.from({length: n}, (_, i) => ({slug: `v${i + 1}`, count: 1}));

    beforeEach(() => {
      catalog.availableFilters.set([
        {slug: 'size', values: manyValues(9)},
        {slug: 'color', values: manyValues(3)},
        {slug: 'scent', values: manyValues(3)},
      ]);
    });

    it('should open the first two sections by default and fold long lists', () => {
      const sections = catalog.sections();
      expect(sections.map(s => [s.key, s.open])).toEqual([['size', true], ['color', true], ['scent', false]]);
      expect(sections[0].items.length).toBe(6);
      expect(sections[0].hiddenCount).toBe(3);
    });

    it('should toggle a section on header click and keep the override', () => {
      catalog.toggleSection(catalog.sections()[2]);
      expect(catalog.sections()[2].open).toBe(true);
      catalog.toggleSection(catalog.sections()[0]);
      expect(catalog.sections()[0].open).toBe(false);
    });

    it('should show all values after "more" and fold back', () => {
      catalog.toggleExpanded('size');
      expect(catalog.sections()[0].items.length).toBe(9);
      expect(catalog.sections()[0].canCollapse).toBe(true);
      catalog.toggleExpanded('size');
      expect(catalog.sections()[0].items.length).toBe(6);
    });

    it('should keep a section open after its selection is removed (pinOpen)', () => {
      catalog.pinOpen('scent');
      expect(catalog.sections()[2].open).toBe(true);
    });
  });

  describe('otherBrands', () => {
    beforeEach(() => {
      catalog.allBrands.set(BRANDS);
    });

    it('should be empty outside a brand page', () => {
      expect(catalog.otherBrands()).toEqual([]);
    });

    it('should exclude the brand currently being viewed', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands().map(b => b.slug)).toEqual(['bath-and-body', 'ann-summers']);
    });

    it('should label entries with the alias and fall back to the brand key', () => {
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([
        {slug: 'bath-and-body', label: 'Bath & Body Works'},
        {slug: 'ann-summers', label: 'AnnSummers'},
      ]);
    });

    it('should be empty when the catalog holds only the current brand', () => {
      catalog.allBrands.set([BRANDS[0]]);
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([]);
    });

    it('should be empty before the brand list is loaded', () => {
      catalog.allBrands.set([]);
      catalog.brandName.set('VictoriasSecret');
      expect(catalog.otherBrands()).toEqual([]);
    });
  });

  describe('facets and products follow the selection (SR-161)', () => {
    let http: HttpTestingController;

    const page = (ids: number[]) => ({content: ids.map(id => ({id})), totalElements: ids.length});
    const groups = (count: number): FilterGroup[] => [
      {slug: 'type', nameRu: 'Тип', nameRo: 'Tip', values: [
        {slug: 'cream', valueRu: 'Крем', valueRo: 'Cremă', count},
        {slug: 'gel', valueRu: 'Гель', valueRo: 'Gel', count: 0},
      ]},
    ];
    const facets = () => http.match(r => r.url.endsWith('/5/filters'));
    const products = () => http.match(r => r.url.endsWith('/5/products'));
    const filtersOf = (r: TestRequest) => r.request.params.get('filters');

    /** Opens category 5 and answers the initial requests. */
    function openCategory() {
      catalog.currentCategoryId = '5';
      catalog.setCategory('5');
      http.match(r => r.url.endsWith('/5/brands')).forEach(r => r.flush([]));
      facets().forEach(r => r.flush(groups(10)));
      products().forEach(r => r.flush(page([1, 2])));
    }

    beforeEach(() => {
      http = TestBed.inject(HttpTestingController);
      openCategory();
    });

    afterEach(() => http.verify());

    it('should request facets with the current filters param on every selection change', () => {
      catalog.toggleFilter('type', 'cream');
      const [f] = facets();
      expect(filtersOf(f)).toBe('type:cream');
      expect(filtersOf(products()[0])).toBe('type:cream');
      f.flush(groups(3));
      products()[0]?.flush(page([1]));

      catalog.clearAllFilters();
      const [reset] = facets();
      expect(reset.request.params.has('filters')).toBeFalse();
      reset.flush(groups(10));
      products().forEach(r => r.flush(page([1, 2])));
    });

    it('should keep the previous facets until the new ones arrive', () => {
      catalog.toggleFilter('type', 'cream');
      expect(catalog.availableFilters().length).toBe(1);
      expect(catalog.availableFilters()[0].values[0].count).toBe(10);
      const [f] = facets();
      f.flush(groups(3));
      expect(catalog.availableFilters()[0].values[0].count).toBe(3);
      products().forEach(r => r.flush(page([1])));
    });

    it('should cancel the previous facets and products requests; the second change wins', () => {
      catalog.toggleFilter('type', 'cream');
      const firstFacets = facets()[0];
      const firstProducts = products()[0];
      catalog.toggleFilter('type', 'gel');

      expect(firstFacets.cancelled).toBeTrue();
      expect(firstProducts.cancelled).toBeTrue();

      const secondFacets = facets().filter(r => !r.cancelled)[0];
      const secondProducts = products().filter(r => !r.cancelled)[0];
      expect(filtersOf(secondFacets)).toBe('type:cream,type:gel');
      secondFacets.flush(groups(7));
      secondProducts.flush(page([7, 8, 9]));

      expect(catalog.availableFilters()[0].values[0].count).toBe(7);
      expect(catalog.products().length).toBe(3);
      expect(catalog.isLoading()).toBeFalse();
    });

    it('should show loading until the latest request finishes', () => {
      catalog.toggleFilter('type', 'cream');
      catalog.toggleFilter('type', 'gel');
      expect(catalog.isLoading()).toBeTrue();
      facets().filter(r => !r.cancelled).forEach(r => r.flush(groups(1)));
      products().filter(r => !r.cancelled).forEach(r => r.flush(page([1])));
      expect(catalog.isLoading()).toBeFalse();
    });

    it('should apply "show products" while a request is in flight', () => {
      catalog.openFilterDrawer();
      catalog.toggleFilter('type', 'cream'); // request in flight
      catalog.togglePendingFilter('type', 'gel');
      catalog.applyFiltersAndClose();

      // the drawer's own "N products" counter request (size=1) is not the list request
      const live = products().filter(r => !r.cancelled && r.request.params.get('size') !== '1');
      expect(live.length).toBe(1);
      expect(filtersOf(live[0])).toBe('type:gel');
      live[0].flush(page([5]));
      http.match(r => r.url.endsWith('/5/products')).forEach(r => r.flush(page([5])));
      facets().filter(r => !r.cancelled).forEach(r => r.flush(groups(2)));
      expect(catalog.selectedFilters().get('type')?.has('gel')).toBeTrue();
      expect(catalog.products().length).toBe(1);
    });

    it('should apply "reset all" while a request is in flight', () => {
      catalog.toggleFilter('type', 'cream');
      catalog.clearAllFilters();

      const live = products().filter(r => !r.cancelled);
      expect(live.length).toBe(1);
      expect(live[0].request.params.has('filters')).toBeFalse();
      live[0].flush(page([1, 2, 3, 4]));
      facets().filter(r => !r.cancelled).forEach(r => r.flush(groups(10)));
      expect(catalog.selectedFilters().size).toBe(0);
      expect(catalog.products().length).toBe(4);
    });

    it('should disable a zero-count value unless it is selected', () => {
      const find = (slug: string) => catalog.sections()[0].items.find(i => i.slug === slug)!;
      expect(find('gel').disabled).toBeTrue();
      expect(find('cream').disabled).toBeFalse();

      catalog.availableFilters.set([{slug: 'type', values: [{slug: 'gel', count: 0}, {slug: 'cream', count: 4}]}]);
      catalog.toggleFilter('type', 'gel');
      facets().forEach(r => r.flush(groups(0)));
      products().forEach(r => r.flush(page([])));
      expect(find('gel').selected).toBeTrue();
      expect(find('gel').disabled).toBeFalse();
    });

    it('should label the chip with the group name in the current language', () => {
      catalog.toggleFilter('type', 'cream');
      facets().forEach(r => r.flush(groups(3)));
      products().forEach(r => r.flush(page([1])));

      const chip = catalog.activeChips()[0];
      expect(chip.group?.nameRo).toBe('Tip');
      expect((chip.value as {valueRo: string}).valueRo).toBe('Cremă');
    });

    it('should re-request facets with the selected brand and again when it is cleared', () => {
      catalog.selectBrand('VictoriasSecret');
      const [f] = facets();
      expect(f.request.params.get('brand')).toBe('VictoriasSecret');
      f.flush(groups(2));
      products().forEach(r => r.flush(page([1])));

      catalog.selectBrand(null);
      const [cleared] = facets();
      expect(cleared.request.params.has('brand')).toBeFalse();
      cleared.flush(groups(10));
      products().forEach(r => r.flush(page([1, 2])));
    });

    it('should not let an append cancel a fresh load in flight', () => {
      catalog.toggleFilter('type', 'cream');
      const fresh = products()[0];
      catalog.fetchProducts(true);

      expect(fresh.cancelled).toBeFalse();
      expect(products().length).toBe(0);
      fresh.flush(page([4, 5]));
      facets().forEach(r => r.flush(groups(1)));
      expect(catalog.products().length).toBe(2);
    });

    describe('mobile drawer', () => {
      const flushAll = () => {
        facets().filter(r => !r.cancelled).forEach(r => r.flush(groups(4)));
        products().filter(r => !r.cancelled).forEach(r => r.flush(page([1])));
      };

      it('should request facets with the pending filters on every pending change', () => {
        catalog.openFilterDrawer();
        expect(facets().length).toBe(0);

        catalog.togglePendingFilter('type', 'cream');
        const [f] = facets();
        expect(filtersOf(f)).toBe('type:cream');
        flushAll();
        expect(catalog.selectedFilters().size).toBe(0);

        catalog.selectPendingBrand('VictoriasSecret');
        const [b] = facets();
        expect(b.request.params.get('brand')).toBe('VictoriasSecret');
        flushAll();

        catalog.clearPendingFilters();
        const [c] = facets();
        expect(c.request.params.has('filters')).toBeFalse();
        expect(c.request.params.has('brand')).toBeFalse();
        flushAll();
      });

      it('should cancel the previous pending facets request', () => {
        catalog.openFilterDrawer();
        catalog.togglePendingFilter('type', 'cream');
        const first = facets()[0];
        catalog.togglePendingFilter('type', 'gel');
        expect(first.cancelled).toBeTrue();
        expect(filtersOf(facets().filter(r => !r.cancelled)[0])).toBe('type:cream,type:gel');
        flushAll();
      });

      it('should re-request facets for the applied selection when closed without applying', () => {
        catalog.openFilterDrawer();
        catalog.togglePendingFilter('type', 'cream');
        flushAll();

        catalog.onFilterDrawerHide();
        const [f] = facets();
        expect(f.request.params.has('filters')).toBeFalse();
        flushAll();
      });

      it('should not re-request on close when pending was reverted to the applied selection', () => {
        catalog.openFilterDrawer();
        catalog.togglePendingFilter('type', 'cream');
        flushAll();
        catalog.togglePendingFilter('type', 'cream');
        flushAll();

        catalog.onFilterDrawerHide();
        expect(facets().length).toBe(0);
      });

      it('should keep a pending-selected zero-count value clickable', () => {
        catalog.openFilterDrawer();
        catalog.togglePendingFilter('type', 'gel');
        flushAll();
        const items = catalog.drawerSections()[0].items;
        const gel = items.find(i => i.slug === 'gel');
        expect(gel?.disabled).toBeFalse();
      });

      it('should not add a second facets request on apply', () => {
        catalog.openFilterDrawer();
        catalog.togglePendingFilter('type', 'cream');
        flushAll();

        catalog.applyFiltersAndClose();
        catalog.onFilterDrawerHide();
        expect(facets().length).toBe(0);
        expect(filtersOf(products().filter(r => !r.cancelled)[0])).toBe('type:cream');
        flushAll();
        expect(catalog.selectedFilters().get('type')?.has('cream')).toBeTrue();
      });
    });
  });
  describe('robots on hero pages', () => {
    let meta: Meta;
    const robots = () => meta.getTag("name='robots'")?.content ?? null;

    beforeEach(() => {
      meta = TestBed.inject(Meta);
      meta.removeTag("name='robots'");
    });

    afterEach(() => meta.removeTag("name='robots'"));

    it('should mark a hero collection as noindex, follow', () => {
      catalog.updateRobots('hero');
      expect(robots()).toBe('noindex, follow');
    });

    it('should not add robots on regular catalog pages', () => {
      catalog.updateRobots('bestsellers');
      expect(robots()).toBeNull();
    });

    it('should drop noindex when leaving a hero for another catalog page', () => {
      catalog.updateRobots('hero');
      catalog.updateRobots('brand');
      expect(robots()).toBeNull();
    });

    it('should drop noindex when the hero page is destroyed', () => {
      catalog.updateRobots('hero');
      catalog.ngOnDestroy();
      expect(robots()).toBeNull();
    });

    it('should not touch a robots tag it did not set', () => {
      meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
      catalog.ngOnDestroy();
      expect(robots()).toBe('noindex, nofollow');
    });
  });
});

/** Real router + catalog route, mocked Location and API — the way SSR and the browser drive the page. */
function configureRoutedCatalog(currentLanguage = signal('ro')): void {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([{path: ':lang/catalog/:tag', component: Catalog}]),
      provideLocationMocks(),
      provideNoopAnimations(),
      provideTransloco({
        config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
        loader: TranslocateHttpLoader,
      }),
      {provide: Language, useValue: {currentLanguage}},
    ],
  });
}

describe('Catalog pagination (SR-103)', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;
  let location: Location;
  let doc: Document;

  const PAGE_SIZE = 24;
  const BESTSELLERS = (r: HttpRequest<unknown>) => r.url.endsWith('/products/bestsellers');

  const items = (page: number, count = PAGE_SIZE) =>
    Array.from({length: count}, (_, i) => ({id: `${page}-${i}`, name: `P ${page}-${i}`, price: 1}));

  /** Facet requests of a static listing — not what these tests check. */
  function flushFacets(): void {
    http.match(r => /\/(brands|filters)$/.test(r.url)).forEach(r => r.flush([]));
  }

  /** Answers the pending products request; returns the API page index it asked for. */
  function flushProducts(total: number, count = PAGE_SIZE): number {
    const req = http.expectOne(BESTSELLERS);
    const page = Number(req.request.params.get('page'));
    req.flush({content: items(page, count), totalElements: total});
    return page;
  }

  async function open(url: string, total = 100, count = PAGE_SIZE): Promise<number> {
    await harness.navigateByUrl(url);
    flushFacets();
    const page = flushProducts(total, count);
    harness.detectChanges();
    await harness.fixture.whenStable();
    return page;
  }

  const el = () => harness.routeNativeElement as HTMLElement;
  const prevLink = () => el().querySelector('a.prev-page-link');
  const nextLink = () => el().querySelector('a.load-more-btn') as HTMLAnchorElement | null;
  const listed = () => (harness.routeDebugElement!.componentInstance as {products: () => unknown[]}).products();
  const canonical = () => doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
  const hreflang = (lang: string) => doc.querySelector(`link[rel="alternate"][hreflang="${lang}"]`)?.getAttribute('href');
  const relLink = (rel: string) => doc.querySelector(`link[rel="${rel}"]`)?.getAttribute('href') ?? null;

  beforeEach(async () => {
    configureRoutedCatalog();
    http = TestBed.inject(HttpTestingController);
    location = TestBed.inject(Location);
    doc = TestBed.inject(DOCUMENT);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => {
    doc.querySelectorAll('link[rel="canonical"], link[rel="alternate"], link[rel="prev"], link[rel="next"]')
      .forEach(l => l.remove());
    doc.querySelector('meta[name="robots"]')?.remove();
  });

  it('parses ?page: only an integer >= 2 without leading zeros is a page', () => {
    expect(parseCatalogPage('3')).toBe(3);
    for (const junk of [null, '', '1', '0', '-2', 'abc', '02', '2.5', '1e3', '9999999999']) {
      expect(parseCatalogPage(junk)).withContext(String(junk)).toBeNull();
    }
  });

  it('requests the API page of ?page=N (API pages are 0-based)', async () => {
    expect(await open('/ro/catalog/bestsellers?page=3')).toBe(2);
  });

  it('no ?page → API page 0, no prev link, next link to ?page=2', async () => {
    expect(await open('/ro/catalog/bestsellers')).toBe(0);
    expect(prevLink()).toBeNull();
    expect(nextLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers?page=2');
  });

  it('page 2: prev goes to the clean URL, next to ?page=3', async () => {
    await open('/ro/catalog/bestsellers?page=2');
    expect(prevLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers');
    expect(nextLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers?page=3');
  });

  it('page 3: prev link to ?page=2', async () => {
    await open('/ro/catalog/bestsellers?page=3');
    expect(prevLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers?page=2');
  });

  it('last page: no next link', async () => {
    await open('/ro/catalog/bestsellers?page=3', 3 * PAGE_SIZE);
    expect(nextLink()).toBeNull();
    expect(prevLink()).not.toBeNull();
  });

  it('page >= 2: self-canonical, hreflang, title and rel links carry the page', async () => {
    await open('/ro/catalog/bestsellers?page=3');
    expect(canonical()).toMatch(/\/ro\/catalog\/bestsellers\?page=3$/);
    expect(hreflang('ro')).toMatch(/\/ro\/catalog\/bestsellers\?page=3$/);
    expect(hreflang('ru')).toMatch(/\/ru\/catalog\/bestsellers\?page=3$/);
    expect(hreflang('x-default')).toMatch(/\/ro\/catalog\/bestsellers\?page=3$/);
    expect(doc.title).toContain('— pagina 3');
    expect(doc.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('— pagina 3');
    expect(relLink('prev')).toMatch(/\/ro\/catalog\/bestsellers\?page=2$/);
    expect(relLink('next')).toMatch(/\/ro\/catalog\/bestsellers\?page=4$/);
  });

  it('page 1: canonical without ?page, title without suffix, no rel=prev', async () => {
    await open('/ro/catalog/bestsellers');
    expect(canonical()).toMatch(/\/ro\/catalog\/bestsellers$/);
    expect(doc.title).not.toContain('pagina');
    expect(relLink('prev')).toBeNull();
    expect(relLink('next')).toMatch(/\/ro\/catalog\/bestsellers\?page=2$/);
  });

  it('pages of one listing get different titles', async () => {
    await open('/ro/catalog/bestsellers?page=2');
    const second = doc.title;
    await harness.navigateByUrl('/ro/catalog/bestsellers?page=3');
    flushProducts(100);
    harness.detectChanges();
    expect(doc.title).toContain('— pagina 3');
    expect(doc.title).not.toBe(second);
  });

  it('page past the last one → not found: noindex, no canonical, no rel links', async () => {
    await open('/ro/catalog/bestsellers?page=9', 100, 0);
    expect(canonical()).toBeUndefined();
    expect(relLink('prev')).toBeNull();
    expect(relLink('next')).toBeNull();
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('page past the last one answered with 204 (bestsellers/sales API) → not found too', async () => {
    await harness.navigateByUrl('/ro/catalog/bestsellers?page=9');
    flushFacets();
    http.expectOne(BESTSELLERS).flush(null, {status: 204, statusText: 'No Content'});
    harness.detectChanges();
    expect(canonical()).toBeUndefined();
    expect(doc.querySelector('meta[name="robots"]')?.getAttribute('content')).toBe('noindex, nofollow');
  });

  it('"Load more" appends the next page in place and moves the URL to ?page=N+1 without reloading the list', async () => {
    await open('/ro/catalog/bestsellers?page=2');
    const click = new MouseEvent('click', {button: 0, cancelable: true});
    nextLink()!.dispatchEvent(click);
    expect(click.defaultPrevented).toBeTrue();

    expect(flushProducts(100)).toBe(2);
    harness.detectChanges();
    http.expectNone(BESTSELLERS);                // no reload from scratch
    expect(listed().length).toBe(2 * PAGE_SIZE); // appended, not replaced
    expect(location.path()).toBe('/ro/catalog/bestsellers?page=3');
    expect(nextLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers?page=4');
  });

  it('active filter: "Load more" appends in place but leaves ?page out of the URL and the link (filters are not in it)', async () => {
    await open('/ro/catalog/bestsellers');
    (harness.routeDebugElement!.componentInstance as Catalog).selectBrand('VictoriasSecret');
    expect(flushProducts(100)).toBe(0);
    harness.detectChanges();
    expect(nextLink()?.hasAttribute('href')).toBeFalse();
    expect(nextLink()?.getAttribute('role')).toBe('button');

    nextLink()!.dispatchEvent(new MouseEvent('click', {button: 0, cancelable: true}));
    expect(flushProducts(100)).toBe(1);
    harness.detectChanges();
    expect(listed().length).toBe(2 * PAGE_SIZE);
    expect(location.path()).toBe('/ro/catalog/bestsellers');

    nextLink()!.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', cancelable: true}));
    expect(flushProducts(100)).toBe(2);
    expect(location.path()).toBe('/ro/catalog/bestsellers');
  });

  it('filter cleared: "Load more" moves the URL to ?page=N again', async () => {
    await open('/ro/catalog/bestsellers');
    const catalog = harness.routeDebugElement!.componentInstance as Catalog;
    catalog.selectBrand('VictoriasSecret');
    flushProducts(100);
    catalog.clearAllFilters();
    flushProducts(100);
    harness.detectChanges();
    expect(nextLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers?page=2');

    nextLink()!.dispatchEvent(new MouseEvent('click', {button: 0, cancelable: true}));
    flushProducts(100);
    expect(location.path()).toBe('/ro/catalog/bestsellers?page=2');
  });

  it('a modified click (new tab) is left to the browser', async () => {
    await open('/ro/catalog/bestsellers');
    // called directly: dispatching a real ctrl-click on <a href> would make the test browser navigate
    const click = jasmine.createSpyObj<MouseEvent>('MouseEvent', ['preventDefault'], {button: 0, ctrlKey: true});
    (harness.routeDebugElement!.componentInstance as Catalog).loadMore(click);
    expect(click.preventDefault).not.toHaveBeenCalled();
    http.expectNone(BESTSELLERS);
  });

  it('history step / prev link to another page of the same listing reloads from that page', async () => {
    await open('/ro/catalog/bestsellers?page=3');
    await harness.navigateByUrl('/ro/catalog/bestsellers?page=2');
    expect(flushProducts(100)).toBe(1);
    harness.detectChanges();
    expect(listed().length).toBe(PAGE_SIZE);
    expect(prevLink()?.getAttribute('href')).toBe('/ro/catalog/bestsellers');
  });
});

describe('Catalog category lookup (SR-96 review regression)', () => {
  it('empty category list from the API → exactly one hierarchy/active request', async () => {
    configureRoutedCatalog();
    const http = TestBed.inject(HttpTestingController);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/ro/catalog/sutiene');

    const hierarchy = (r: HttpRequest<unknown>) => r.url.endsWith('web-categories/hierarchy/active');
    http.expectOne(hierarchy).flush([]);
    harness.detectChanges();
    expect(http.match(hierarchy).length).toBe(0);
  });
});
