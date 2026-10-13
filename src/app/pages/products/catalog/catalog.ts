import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnDestroy, OnInit, RESPONSE_INIT, signal} from '@angular/core';
import {Location} from '@angular/common';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';
import {FilterGroup} from '../../../entities/filter-group';
import {ActivatedRoute, ParamMap, Router, RouterLink} from '@angular/router';
import {Meta} from '@angular/platform-browser';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, finalize, map, Observable, shareReplay, Subject, switchMap, take} from 'rxjs';
import {HeroService} from '../../../@core/api/hero';
import {BrandService} from '../../../@core/api/brand';
import {CategoryService} from '../../../@core/api/category';
import {MetaService} from '../../../@core/services/meta.service';
import {Language} from '../../../@core/services/language';
import {Slugify} from '../../../@core/services/slugify';
import {Category, Brand} from '../../../entities/category';
import {getBrandSeo, BrandSeoLocale} from '../../../@core/configs/brand-seo';
import {getCategorySeo} from '../../../@core/configs/category-seo';
import {of} from 'rxjs';
import {TranslocoPipe, TranslocoService} from '@ngneat/transloco';
import {catalogPageQuery, parseCatalogPage} from '../../../@core/services/catalog-page';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {EmptyState} from '../../states/empty-state/empty-state';
import {DrawerModule} from 'primeng/drawer';
import {ProductCardSkeleton} from '../../../shared/components/product/product-card-skeleton/product-card-skeleton';

@Component({
  selector: 'app-catalog',
  imports: [
    FadeUp,
    ProductList,
    TranslocoPipe,
    LocalizedNamePipe,
    EmptyState,
    DrawerModule,
    ProductCardSkeleton,
    RouterLink,
  ],
  providers: [ProductService],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalog implements OnInit, OnDestroy {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private heroService = inject(HeroService);
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  private metaService = inject(MetaService);
  private meta = inject(Meta);
  private langService = inject(Language);
  private slugify = inject(Slugify);
  private location = inject(Location);
  private transloco = inject(TranslocoService);
  public activeLang = this.langService.currentLanguage;
  private destroyRef = inject(DestroyRef);
  private responseInit = inject(RESPONSE_INIT, {optional: true});

  /** Категория/бренд не найдены по успешному ответу API → 404 + noindex, без canonical/hreflang. */
  protected notFound = signal(false);

  protected category = signal<string | null>(null);
  protected brandName = signal<string | null>(null);
  protected brandAlias = signal<string | null>(null);
  protected categoryName = signal<string | null>(null);
  protected categoryData = signal<Category | null>(null);
  protected products = signal<Product[]>([]);
  protected isLoading = signal(false);
  protected allLoaded = signal(false);

  // Brand filter
  protected availableBrands = signal<{brand: string, brandAlias: string}[]>([]);

  // Полный список брендов каталога — для блока перелинковки внизу брендовой страницы
  protected allBrands = signal<Brand[]>([]);
  protected selectedBrand = signal<string | null>(null);

  // Product filters
  protected availableFilters = signal<FilterGroup[]>([]);
  protected selectedFilters = signal<Map<string, Set<string>>>(new Map());

  // Mobile filter drawer
  filterDrawerVisible = false;
  protected totalProductCount = signal<number>(0);
  brandSectionOpen = true;

  // Pending state for mobile drawer (applied only on "Show results" tap)
  protected pendingBrand = signal<string | null>(null);
  protected pendingFilters = signal<Map<string, Set<string>>>(new Map());
  protected pendingCount = signal<number | null>(null);
  private pendingCountRequest$ = new Subject<string>();

  protected activeFilterCount = computed(() => {
    let count = 0;
    if (this.selectedBrand()) count++;
    this.selectedFilters().forEach(values => count += values.size);
    return count;
  });

  protected pendingFilterCount = computed(() => {
    let count = 0;
    if (this.pendingBrand()) count++;
    this.pendingFilters().forEach(values => count += values.size);
    return count;
  });

  protected localizedCategoryName = computed(() => {
    const cat = this.categoryData();
    if (!cat) return this.categoryName();
    return (this.activeLang() === 'ro' ? cat.nameRo : cat.nameRu) || cat.name;
  });

  /** Слаг бренда в URL — ключ словаря BRAND_SEO. */
  protected brandSlugValue = computed(() => {
    const brand = this.brandName();
    return brand ? this.brandService.toSlug(brand) : null;
  });

  /** Ручной SEO-текст бренда (h2 + абзацы). null → работает generic-шаблон. */
  protected brandSeo = computed<BrandSeoLocale | null>(() =>
    getBrandSeo(this.brandSlugValue(), this.activeLang())
  );

  /** Перелинковка: остальные бренды каталога, ссылками с брендовой страницы. */
  protected otherBrands = computed(() => {
    const current = this.brandSlugValue();
    if (!current) return [];
    return this.allBrands()
      .filter(b => this.brandService.toSlug(b.brand) !== current)
      .map(b => ({
        slug: this.brandService.toSlug(b.brand),
        label: b.brandAlias || b.brand
      }));
  });

  protected hasFilters = computed(() => {
    return this.availableBrands().length > 1 || this.availableFilters().length > 0;
  });

  // SR-103: pagination via ?page=N (1-based; page 1 = clean URL)
  /** Page the list starts from: ?page=N on entry. Drives title, canonical, hreflang and the prev link. */
  protected firstPage = signal(1);
  /** Last page loaded into the list ("Load more" appends pages after firstPage). */
  protected lastPage = signal(1);
  /** Listing path without language and query, e.g. "catalog/brand/victorias-secret". */
  private listingTail = signal<string | null>(null);

  protected basePath = computed(() => {
    const tail = this.listingTail();
    return tail ? `/${this.activeLang()}/${tail}` : null;
  });

  /** Known total → exact; unknown total → keep offering the next page until an empty one comes back (as before). */
  protected hasNextPage = computed(() => {
    if (this.allLoaded() || this.products().length === 0) return false;
    const total = this.totalProductCount();
    return total > 0 ? this.lastPage() * this.itemsPerPage < total : true;
  });

  protected prevPageQuery = computed(() => {
    const prev = this.firstPage() - 1;
    return prev >= 2 ? {page: prev} : {};
  });

  protected nextPageHref = computed(() => `${this.basePath()}${catalogPageQuery(this.lastPage() + 1)}`);

  private currentCategoryId: string | null = null;
  private currentHeroId: number | null = null;
  private robotsNoindex = false;
  /** Route params the list was loaded for — tells a page-only change (same listing) from a new listing. */
  private loadedParamsKey: string | null = null;
  /** Page currently shown in the address bar. */
  private urlPage = 1;
  private currentPage = 0;
  private readonly itemsPerPage = 24;
  private prefetched: { page: number; request$: Observable<any> } | null = null;

  constructor() {
    effect(() => {
      const cat = this.category();
      const brand = this.brandName();
      const alias = this.brandAlias();
      const catName = this.categoryName();
      const catData = this.categoryData();
      const lang = this.langService.currentLanguage();
      const page = this.firstPage();

      if (cat || brand) {
        this.updateMeta(cat, brand, alias, catName, catData, lang, page);
        // updateMeta ставит canonical/hreflang — на 404 снимаем их следом
        if (this.notFound()) this.metaService.removeCanonicalAndAlternates();
      }
    });

    // <link rel="prev|next"> describe the page the visitor landed on; none on 404
    effect(() => {
      const base = this.basePath();
      const first = this.firstPage();
      const total = this.totalProductCount();
      if (!base || this.notFound()) {
        this.metaService.setPaginationLinks(null, null);
        return;
      }
      this.metaService.setPaginationLinks(
        first >= 2 ? base + catalogPageQuery(first - 1) : null,
        total > first * this.itemsPerPage ? base + catalogPageQuery(first + 1) : null
      );
    });

    this.pendingCountRequest$.pipe(
      switchMap(identifier => this.loadByCategory(identifier, 0, 1, true).pipe(catchError(() => of(null)))),
      takeUntilDestroyed()
    ).subscribe(res => this.pendingCount.set(res?.totalElements ?? null));
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntilDestroyed(this.destroyRef),
      map(p => ({ tag: p.get('tag'), slug: p.get('brandName'), heroId: p.get('heroId') })),
      switchMap(({ tag, slug, heroId }) => {
        // Hero route: /catalog/hero/:heroId
        if (heroId) {
          this.currentHeroId = +heroId;
          return of({ tag: 'hero', brandName: null, brandAlias: null, categoryId: null, categoryName: null, categoryObj: null as Category | null });
        }

        if (slug) {
          return this.brandService.gerAllBrands().pipe(
            map(brands => {
              // держим весь список — нужен блоку перелинковки «другие бренды»
              this.allBrands.set(brands);
              const original = brands.find(b => this.brandService.toSlug(b.brand) === slug);
              return {
                tag: 'brand',
                // ответ API успешный, а такого бренда нет (пустой список за «нет» не считаем)
                notFound: brands.length > 0 && !original,
                brandName: original?.brand ?? slug,
                brandAlias: original?.brandAlias ?? original?.brand ?? slug,
                categoryId: null,
                categoryName: null,
                categoryObj: null as Category | null
              };
            })
          );
        }

        const staticCategories = ['vs', 'bb', 'bestsellers', 'new-arrivals', 'sales'];
        if (tag && staticCategories.includes(tag)) {
          return of({ tag: tag, brandName: null, brandAlias: null, categoryId: null, categoryName: null, categoryObj: null as Category | null });
        }

        if (tag) {
          // список категорий (кэш сервиса) — чтобы пустой ответ API не считать «такой категории нет»
          return this.categoryService.getCategories().pipe(
            // lookup in the list already loaded: an empty API answer leaves the service cache empty,
            // and getCategoryBySlug() would request hierarchy/active a second time
            map(all => ({ cat: this.categoryService.findCategoryBySlug(all, tag), known: all.length > 0 })),
            map(({ cat, known }) => ({
              tag: tag,
              // getCategoryBySlug: ошибка API летит ошибкой, null — успешный ответ без совпадения;
              // пустой список за «нет» не считаем (как у брендов)
              notFound: known && !cat,
              brandName: null,
              brandAlias: null,
              categoryId: cat ? cat.id.toString() : tag,
              categoryName: cat ? cat.name : null,
              categoryObj: cat
            }))
          );
        }

        return of({ tag: 'vs', brandName: null, brandAlias: null, categoryId: null, categoryName: null, categoryObj: null as Category | null });
      })
    ).subscribe(result => {
      const { tag, brandName, brandAlias, categoryId, categoryName, categoryObj } = result;
      this.setNotFound('notFound' in result && result.notFound);

      // Redirect to correct language slug if needed
      if (categoryObj && tag) {
        const lang = this.langService.currentLanguage();
        const expectedSlug = this.slugify.categorySlug(categoryObj, lang);
        if (expectedSlug && tag !== expectedSlug) {
          this.router.navigate(['/', lang, 'catalog', expectedSlug], { replaceUrl: true, queryParamsHandling: 'preserve' });
          return;
        }
      }

      this.brandName.set(brandName);
      this.brandAlias.set(brandAlias);
      this.categoryName.set(categoryName);
      this.categoryData.set(categoryObj ?? null);
      this.currentCategoryId = categoryId;
      this.updateRobots(tag);

      const params = this.route.snapshot.paramMap;
      const heroId = params.get('heroId');
      const brandSlug = params.get('brandName');
      this.listingTail.set(heroId ? `catalog/hero/${heroId}` : brandSlug ? `catalog/brand/${brandSlug}` : `catalog/${tag}`);
      this.loadedParamsKey = this.paramsKey(params);
      this.setPage(parseCatalogPage(this.route.snapshot.queryParamMap.get('page')) ?? 1);
      this.setCategory(tag!);
    });

    // Same listing, only ?page changed (prev link, browser back/forward): paramMap stays silent — reload from that page.
    // A new listing is handled above (it reads ?page itself); our own "Load more" URL update doesn't go through the router.
    this.route.queryParamMap.pipe(
      takeUntilDestroyed(this.destroyRef),
      map(q => parseCatalogPage(q.get('page')) ?? 1)
    ).subscribe(page => {
      if (this.loadedParamsKey !== this.paramsKey(this.route.snapshot.paramMap) || page === this.urlPage) return;
      this.setPage(page);
      this.reset();
      this.fetchProducts();
    });
  }

  private paramsKey(params: ParamMap): string {
    return params.keys.map(k => `${k}=${params.get(k)}`).join('&');
  }

  private setPage(page: number): void {
    this.firstPage.set(page);
    this.lastPage.set(page);
    this.urlPage = page;
  }

  /**
   * Mirrors the loaded page in the address bar. Location, not the router: a router navigation would
   * scroll to top (scrollPositionRestoration) and fire page views — the list must just grow in place.
   */
  private syncUrlPage(page: number): void {
    if (page === this.urlPage) return;
    this.urlPage = page;
    const tree = this.router.parseUrl(this.location.path());
    const rest = {...tree.queryParams};
    delete rest['page'];
    tree.queryParams = page >= 2 ? {...rest, page: String(page)} : rest;
    this.location.replaceState(this.router.serializeUrl(tree), '', this.location.getState());
  }

  /** 404 + noindex по образцу product-detail; canonical/hreflang снимает эффект меты. */
  private setNotFound(notFound: boolean): void {
    this.notFound.set(notFound);
    if (!notFound) return;
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
    this.metaService.removeCanonicalAndAlternates();
    if (this.responseInit) {
      this.responseInit.status = 404;
      this.responseInit.statusText = 'Not Found';
    }
  }

  ngOnDestroy(): void {
    this.metaService.clearAlternateOverride();
    this.metaService.setPaginationLinks(null, null);
    if (this.robotsNoindex) this.meta.removeTag("name='robots'");
  }

  /**
   * Hero collections (/catalog/hero/:id) are promo selections of products already listed
   * in regular catalog pages — keep them out of the index, but let crawlers follow product links.
   */
  private updateRobots(tag: string | null) {
    if (tag === 'hero') {
      this.meta.updateTag({name: 'robots', content: 'noindex, follow'});
      this.robotsNoindex = true;
    } else if (this.robotsNoindex) {
      this.meta.removeTag("name='robots'");
      this.robotsNoindex = false;
    }
  }

  private updateMeta(category: string | null, brand: string | null, alias: string | null, catName: string | null, catData: Category | null, lang: string, page = 1) {
    let title = 'Catalog | Secret Room';
    let description = 'Catalog de produse Secret Room';
    let keywords = 'cosmetice, lenjerie, moldova, chisinau';

    const isRo = lang === 'ro';
    const displayBrand = alias || brand;

    if (displayBrand) {
      // Ручные тексты по бренду, если бренд есть в словаре; иначе — общий шаблон
      const brandSeo = getBrandSeo(brand ? this.brandService.toSlug(brand) : null, lang);
      if (brandSeo) {
        title = brandSeo.title;
        description = brandSeo.description;
        keywords = brandSeo.keywords;
      } else {
        if (isRo) {
          title = `${displayBrand} Moldova — Produse Originale | Secret Room`;
          description = `${displayBrand} în Moldova: produse originale la Secret Room. Comandă online cu livrare în Chișinău și toată Moldova.`;
        } else {
          title = `${displayBrand} Молдова — Оригинальная продукция | Secret Room`;
          description = `${displayBrand} в Молдове: оригинальные товары в Secret Room. Заказ онлайн с доставкой по Кишинёву и всей Молдове.`;
        }
        keywords = `${displayBrand}, ${displayBrand} moldova, ${displayBrand} chisinau, ${displayBrand} pret, купить ${displayBrand} молдова, ${displayBrand} кишинев`;
      }
    } else if (category) {
      const localizedName = catData
        ? (isRo ? catData.nameRo : catData.nameRu) || catData.name
        : catName;

      // Ручные тексты по конкретной категории (сломанные сниппеты из Search Console)
      const categorySeo = getCategorySeo(catData?.id, lang);

      if (categorySeo) {
        title = categorySeo.title;
        description = categorySeo.description;
        keywords = categorySeo.keywords;
      } else if (localizedName) {
        // Dynamic category with known name
        if (isRo) {
          title = `${localizedName} Victoria's Secret și Bath & Body Works — Moldova | Secret Room`;
          description = `${localizedName} originale în Moldova. Victoria's Secret și Bath & Body Works — comandă online sau vizitează magazinele Secret Room din Chișinău.`;
        } else {
          title = `${localizedName} Victoria's Secret и Bath & Body Works — Молдова | Secret Room`;
          description = `${localizedName} оригинал в Молдове. Victoria's Secret и Bath & Body Works — закажите онлайн или в магазинах Secret Room в Кишинёве.`;
        }
        const nameRo = catData?.nameRo || localizedName;
        const nameRu = catData?.nameRu || localizedName;
        keywords = `${nameRo}, ${nameRu}, victoria secret ${nameRo.toLowerCase()}, ${nameRo.toLowerCase()} moldova, ${nameRo.toLowerCase()} chisinau, купить ${nameRu.toLowerCase()} молдова, ${nameRu.toLowerCase()} кишинев`;
      } else {
        switch (category) {
          case 'bestsellers':
            if (isRo) {
              title = "Bestsellere Victoria's Secret și Bath & Body Works | Secret Room Moldova";
              description = "Cele mai vândute produse din magazinul Secret Room: parfumuri, loțiuni, lenjerie Victoria's Secret și lumânări Bath & Body Works. Livrare în Moldova.";
            } else {
              title = "Хиты продаж Victoria's Secret и Bath & Body Works | Secret Room Молдова";
              description = "Самые продаваемые товары в Secret Room: парфюмы, лосьоны, бельё Victoria's Secret и свечи Bath & Body Works. Доставка по Молдове.";
            }
            keywords = "bestsellers, cele mai vandute, хиты продаж, victoria secret популярные, bath body works bestsellers, moldova";
            break;
          case 'new-arrivals':
            if (isRo) {
              title = "Produse noi Victoria's Secret și Bath & Body Works | Secret Room Moldova";
              description = "Ultimele produse adăugate în Secret Room: parfumuri, loțiuni, lenjerie Victoria's Secret și cosmetice Bath & Body Works. Import din SUA.";
            } else {
              title = "Новинки Victoria's Secret и Bath & Body Works | Secret Room Молдова";
              description = "Последние поступления в Secret Room: парфюмы, лосьоны, бельё Victoria's Secret и косметика Bath & Body Works. Импорт из США.";
            }
            keywords = "noutati, новинки, produse noi, new arrivals, victoria secret nou, bath body works nou, moldova";
            break;
          case 'sales':
            if (isRo) {
              title = "Reduceri Victoria's Secret și Bath & Body Works | Secret Room Moldova";
              description = "Produse originale Victoria's Secret și Bath & Body Works la prețuri reduse. Parfumuri, loțiuni, lenjerie, lumânări — stocuri limitate.";
            } else {
              title = "Скидки Victoria's Secret и Bath & Body Works | Secret Room Молдова";
              description = "Оригинальная продукция Victoria's Secret и Bath & Body Works по сниженным ценам. Парфюмы, лосьоны, бельё, свечи — количество ограничено.";
            }
            keywords = "reduceri, скидки, sale, oferte, victoria secret reduceri, bath body works reduceri, moldova";
            break;
        }
      }
    }

    // Page N >= 2: own title/description ("— pagina N"), otherwise every page of a listing shares one title
    const pageTitle = page >= 2 ? this.withPageSuffix(title, page, lang) : title;
    const pageDescription = page >= 2
      ? `${description.replace(/[.\s]+$/, '')} ${this.pageSuffix(page, lang)}`
      : description;

    this.metaService.updateTitle(pageTitle);
    this.metaService.updateDescription(pageDescription);
    this.metaService.updateKeywords(keywords);
    this.metaService.updateCanonicalUrl();

    if (catData) {
      const roSlug = this.slugify.categorySlug(catData, 'ro');
      const ruSlug = this.slugify.categorySlug(catData, 'ru');
      const pageQuery = catalogPageQuery(page);
      this.metaService.setAlternateOverride(
        `https://secretroom.md/ro/catalog/${roSlug}${pageQuery}`,
        `https://secretroom.md/ru/catalog/${ruSlug}${pageQuery}`
      );
    } else {
      this.metaService.clearAlternateOverride();
    }

    this.metaService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": description
    }, 'collection');

    this.updateBreadcrumbs(category, brand, alias, catData, lang);
  }

  /**
   * selectTranslate, not translate(): it loads the language first. Translations are bundled (static loader),
   * so it emits synchronously — also during SSR, before any transloco pipe has loaded the active language.
   */
  private pageSuffix(page: number, lang: string): string {
    let suffix = '';
    this.transloco.selectTranslate('catalog.pageSuffix', {page}, lang).pipe(take(1))
      .subscribe(value => suffix = value);
    return suffix;
  }

  /** "Name — pagina 2 | Secret Room": the suffix goes before the site part so it survives SERP truncation. */
  private withPageSuffix(title: string, page: number, lang: string): string {
    const suffix = this.pageSuffix(page, lang);
    const site = title.indexOf(' | ');
    return site >= 0 ? `${title.slice(0, site)} ${suffix}${title.slice(site)}` : `${title} ${suffix}`;
  }

  private updateBreadcrumbs(category: string | null, brand: string | null, alias: string | null, catData: Category | null, lang: string) {
    const isRo = lang === 'ro';
    const breadcrumbs: { label: string, url: string }[] = [
      { label: 'Secret Room', url: `/${lang}` }
    ];

    if (brand) {
      breadcrumbs.push({ label: alias || brand, url: `/${lang}/catalog/brand/${this.brandService.toSlug(brand)}` });
      this.metaService.setBreadcrumbJsonLd(breadcrumbs);
    } else if (catData) {
      if (catData.parentCategoryId) {
        this.categoryService.getCategories().pipe(take(1)).subscribe(categories => {
          const flat = categories.flatMap(c => [c, ...(c.children || [])]);
          const parent = flat.find(c => c.id === catData.parentCategoryId);
          if (parent) {
            const parentName = (isRo ? parent.nameRo : parent.nameRu) || parent.name;
            const parentSlug = this.slugify.categorySlug(parent, lang);
            breadcrumbs.push({ label: parentName, url: `/${lang}/catalog/${parentSlug}` });
          }
          const name = (isRo ? catData.nameRo : catData.nameRu) || catData.name;
          const slug = this.slugify.categorySlug(catData, lang);
          breadcrumbs.push({ label: name, url: `/${lang}/catalog/${slug}` });
          this.metaService.setBreadcrumbJsonLd(breadcrumbs);
        });
      } else {
        const name = (isRo ? catData.nameRo : catData.nameRu) || catData.name;
        const slug = this.slugify.categorySlug(catData, lang);
        breadcrumbs.push({ label: name, url: `/${lang}/catalog/${slug}` });
        this.metaService.setBreadcrumbJsonLd(breadcrumbs);
      }
    } else if (category) {
      const staticNames: Record<string, { ro: string, ru: string }> = {
        'vs': { ro: "Victoria's Secret", ru: "Victoria's Secret" },
        'bb': { ro: 'Bath & Body Works', ru: 'Bath & Body Works' },
        'bestsellers': { ro: 'Bestsellere', ru: 'Хиты продаж' },
        'new-arrivals': { ro: 'Noutăți', ru: 'Новинки' },
        'sales': { ro: 'Reduceri', ru: 'Скидки' },
      };
      const name = staticNames[category];
      if (name) {
        breadcrumbs.push({ label: isRo ? name.ro : name.ru, url: `/${lang}/catalog/${category}` });
      }
      this.metaService.setBreadcrumbJsonLd(breadcrumbs);
    }
  }

  private setCategory(tag: string) {
    this.category.set(tag);
    this.reset();
    this.loadFilters();
    this.fetchProducts();
  }

  private reset() {
    this.currentPage = this.firstPage() - 1;
    this.lastPage.set(this.firstPage());
    this.allLoaded.set(false);
    this.products.set([]);
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
    this.prefetched = null;
  }

  private loadFilters() {
    const categoryId = this.currentCategoryId;
    const brand = this.brandName();
    const tag = this.category();

    // Static "new arrivals" / "bestsellers" pages — load facets and brands from the product API
    if (tag === 'new-arrivals' || tag === 'bestsellers') {
      const brands$ = tag === 'new-arrivals'
        ? this.productService.getBrandsForNewArrivals()
        : this.productService.getBrandsForBestsellers();
      const filters$ = tag === 'new-arrivals'
        ? this.productService.getFiltersForNewArrivals()
        : this.productService.getFiltersForBestsellers();

      brands$.pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      ).subscribe(brands => this.availableBrands.set(brands));
      filters$.pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      ).subscribe(filters => this.availableFilters.set(filters));
      return;
    }

    if (brand) {
      // Brand page — load filters for this brand
      this.availableBrands.set([]);
      this.brandService.getFiltersForBrand(brand).pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError(() => of([]))
      ).subscribe(filters => {
        this.availableFilters.set(filters);
      });
      return;
    }

    if (!categoryId) {
      this.availableBrands.set([]);
      this.availableFilters.set([]);
      return;
    }

    // Category page — load brands and filters
    this.categoryService.getBrandsForCategory(categoryId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([]))
    ).subscribe(brands => {
      this.availableBrands.set(brands);
    });
    this.categoryService.getFiltersForCategory(categoryId).pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([]))
    ).subscribe(filters => {
      this.availableFilters.set(filters);
    });
  }

  selectBrand(brand: string | null) {
    this.selectedBrand.set(brand);
    this.restartFromFirstPage();
  }

  toggleFilter(filterSlug: string, valueSlug: string) {
    const current = new Map(this.selectedFilters());
    const values = current.get(filterSlug) ?? new Set<string>();

    if (values.has(valueSlug)) {
      values.delete(valueSlug);
      if (values.size === 0) {
        current.delete(filterSlug);
      }
    } else {
      values.add(valueSlug);
      current.set(filterSlug, values);
    }

    this.selectedFilters.set(current);
    this.restartFromFirstPage();
  }

  isFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.selectedFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearAllFilters() {
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
    this.restartFromFirstPage();
  }

  openFilterDrawer() {
    // Copy current state → pending
    this.pendingBrand.set(this.selectedBrand());
    const copy = new Map<string, Set<string>>();
    this.selectedFilters().forEach((vals, key) => copy.set(key, new Set(vals)));
    this.pendingFilters.set(copy);
    this.pendingCount.set(null);
    this.filterDrawerVisible = true;
  }

  selectPendingBrand(brand: string | null) {
    this.pendingBrand.set(brand);
    this.refreshPendingCount();
  }

  togglePendingFilter(filterSlug: string, valueSlug: string) {
    const current = new Map(this.pendingFilters());
    const values = current.get(filterSlug) ?? new Set<string>();

    if (values.has(valueSlug)) {
      values.delete(valueSlug);
      if (values.size === 0) current.delete(filterSlug);
    } else {
      values.add(valueSlug);
      current.set(filterSlug, values);
    }

    this.pendingFilters.set(current);
    this.refreshPendingCount();
  }

  isPendingFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.pendingFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearPendingFilters() {
    this.pendingBrand.set(null);
    this.pendingFilters.set(new Map());
    this.refreshPendingCount();
  }

  private refreshPendingCount() {
    const categoryIdentifier = this.currentCategoryId || this.category();
    if (!categoryIdentifier) return;
    this.pendingCountRequest$.next(categoryIdentifier);
  }

  applyFiltersAndClose() {
    // Copy pending → actual and fetch
    this.selectedBrand.set(this.pendingBrand());
    const copy = new Map<string, Set<string>>();
    this.pendingFilters().forEach((vals, key) => copy.set(key, new Set(vals)));
    this.selectedFilters.set(copy);
    this.restartFromFirstPage();
    this.filterDrawerVisible = false;
  }

  /** Filter change: the filtered list starts over from page 1, and so does the URL. */
  private restartFromFirstPage() {
    this.firstPage.set(1);
    this.lastPage.set(1);
    this.syncUrlPage(1);
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
  }

  private buildFiltersParam(map: Map<string, Set<string>> = this.selectedFilters()): string | undefined {
    if (map.size === 0) return undefined;

    const parts: string[] = [];
    map.forEach((values, slug) => {
      values.forEach(v => parts.push(`${slug}:${v}`));
    });
    return parts.join(',');
  }

  /** "Load more" is a real link to ?page=N+1 (crawlers follow it); a plain click appends the page in place. */
  loadMore(event?: MouseEvent): void {
    // modified/middle click — let the browser open the link itself
    if (event && (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    event?.preventDefault();
    this.fetchProducts(true);
  }

  prefetchNext(): void {
    if (this.isLoading() || this.allLoaded()) return;
    const nextPage = this.currentPage + 1;
    if (this.prefetched?.page === nextPage) return;
    const categoryIdentifier = this.currentCategoryId || this.category();
    if (!categoryIdentifier) return;
    const request$ = this.loadByCategory(categoryIdentifier, nextPage, this.itemsPerPage).pipe(
      catchError(() => of(null)),
      shareReplay(1)
    );
    this.prefetched = { page: nextPage, request$ };
    request$.subscribe();
  }

  fetchProducts(append = false) {
    if (this.isLoading() || this.allLoaded()) return;

    const page = append ? this.currentPage + 1 : this.firstPage() - 1;
    const category = this.category();
    const categoryIdentifier = this.currentCategoryId || category;

    let source$: Observable<any>;
    if (append && this.prefetched?.page === page) {
      source$ = this.prefetched.request$;
      this.prefetched = null;
    } else {
      if (!append) this.prefetched = null;
      source$ = this.loadByCategory(categoryIdentifier!, page, this.itemsPerPage);
    }

    this.isLoading.set(true);
    source$
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(res => this.applyProductsResponse(res, page, append));
  }

  private applyProductsResponse(res: any, page: number, append: boolean) {
    this.totalProductCount.set(res?.totalElements ?? 0);
    const items = res?.content ?? [];

    if (!items.length) {
      this.allLoaded.set(true);
      // landed on ?page=N past the last page: a successful empty page (empty content or 204, as bestsellers/sales
      // answer) is "not found". An API error never gets here — the first-page request has no catchError.
      if (!append && page > 0) this.setNotFound(true);
      return;
    }

    this.currentPage = page;
    this.lastPage.set(page + 1);
    if (append) this.syncUrlPage(page + 1);
    this.products.set(append ? [...this.products(), ...items] : items);
    this.setItemListJsonLd(this.products());
  }

  private setItemListJsonLd(products: Product[]) {
    const lang = this.langService.currentLanguage();
    this.metaService.setJsonLd({
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      'itemListElement': products.slice(0, 12).map((p, i) => ({
        '@type': 'ListItem',
        'position': i + 1,
        'url': `https://secretroom.md/${lang}/product/${p.id}/${encodeURIComponent(p.name || '')}`
      }))
    }, 'item-list');
  }

  private loadByCategory(category: string, page: number, size: number, pending = false) {
    const brand = (pending ? this.pendingBrand() : this.selectedBrand()) || undefined;
    const filters = this.buildFiltersParam(pending ? this.pendingFilters() : this.selectedFilters());
    switch (category) {
      case 'vs':
      case 'bb':
        return this.productService.getAllProductsByBrand(category, page, size);
      case 'bestsellers':
        return this.productService.getBestSellers(page, size, brand, filters);
      case 'new-arrivals':
        return this.productService.getNewArrivals(page, size, brand, filters);
      case 'sales':
        return this.productService.getSales(page, size);
      case 'hero':
        return this.heroService.getHeroProductsById(this.currentHeroId!, page, size);
     case 'brand':
        return this.brandService.getProductsByBrand(this.brandName()!, page, size, filters);
      default:
        return this.categoryService.getProductsByGroupId(category, page, size, brand, filters);
    }
  }
}
