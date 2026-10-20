import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';
import {FilterGroup} from '../../../entities/filter-group';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, EMPTY, map, Observable, shareReplay, Subject, switchMap, take} from 'rxjs';
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
import {TranslocoPipe} from '@ngneat/transloco';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {EmptyState} from '../../states/empty-state/empty-state';
import {DrawerModule} from 'primeng/drawer';
import {ProductCardSkeleton} from '../../../shared/components/product/product-card-skeleton/product-card-skeleton';
import {BRAND_SECTION_KEY, buildFilterSections, FilterSectionView} from './catalog-filters.util';

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
  private langService = inject(Language);
  private slugify = inject(Slugify);
  public activeLang = this.langService.currentLanguage;
  private destroyRef = inject(DestroyRef);

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

  // Аккордеон разделов фильтров (в памяти страницы). Ключ — слаг группы или BRAND_SECTION_KEY.
  // Клик пользователя поверх дефолта; сбрасывается при смене категории.
  protected readonly brandKey = BRAND_SECTION_KEY;
  private openOverrides = signal<Map<string, boolean>>(new Map());
  private expandedKeys = signal<Set<string>>(new Set());

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

  /** Разделы сайдбара: структура и отметки — по применённому выбору. */
  protected sections = computed<FilterSectionView[]>(() => buildFilterSections({
    brands: this.availableBrands(),
    groups: this.availableFilters(),
    appliedBrand: this.selectedBrand(),
    appliedFilters: this.selectedFilters(),
    markBrand: this.selectedBrand(),
    markFilters: this.selectedFilters(),
    openOverrides: this.openOverrides(),
    expandedKeys: this.expandedKeys(),
  }));

  /** Разделы нижней панели: структура фиксирована применённым выбором, отметки — pending. */
  protected drawerSections = computed<FilterSectionView[]>(() => buildFilterSections({
    brands: this.availableBrands(),
    groups: this.availableFilters(),
    appliedBrand: this.selectedBrand(),
    appliedFilters: this.selectedFilters(),
    markBrand: this.pendingBrand(),
    markFilters: this.pendingFilters(),
    openOverrides: this.openOverrides(),
    expandedKeys: this.expandedKeys(),
  }));

  protected hasFilters = computed(() => this.sections().length > 0);

  /** Чипы выбранных фильтров над списком товаров. */
  protected activeChips = computed(() => {
    const chips: {kind: 'brand' | 'group'; groupSlug: string; valueSlug: string; group?: FilterGroup; value?: unknown; label?: string}[] = [];
    const brand = this.selectedBrand();
    if (brand) {
      const found = this.availableBrands().find(b => b.brand === brand);
      chips.push({kind: 'brand', groupSlug: BRAND_SECTION_KEY, valueSlug: brand, label: found?.brandAlias || brand});
    }
    for (const group of this.availableFilters()) {
      for (const v of group.values) {
        if (this.selectedFilters().get(group.slug)?.has(v.slug)) {
          chips.push({kind: 'group', groupSlug: group.slug, valueSlug: v.slug, group, value: v});
        }
      }
    }
    return chips;
  });

  private currentCategoryId: string | null = null;
  private currentHeroId: number | null = null;
  private currentPage = 0;
  private readonly itemsPerPage = 24;
  private prefetched: { page: number; request$: Observable<any> } | null = null;

  // Each stream cancels its in-flight request on a new emission (switchMap), so the last
  // user action always wins and an outdated response can never overwrite a newer one.
  private productsRequest$ = new Subject<{ page: number; append: boolean; source$: Observable<any> }>();
  private facetsRequest$ = new Subject<Observable<FilterGroup[]>>();
  /** Key (filters + brand) of the last facets request; null = nothing requested yet. */
  private lastFacetsKey: string | null = null;

  constructor() {
    effect(() => {
      const cat = this.category();
      const brand = this.brandName();
      const alias = this.brandAlias();
      const catName = this.categoryName();
      const catData = this.categoryData();
      const lang = this.langService.currentLanguage();

      if (cat || brand) {
        this.updateMeta(cat, brand, alias, catName, catData, lang);
      }
    });

    this.productsRequest$.pipe(
      switchMap(req => req.source$.pipe(
        map(res => ({req, res})),
        catchError(() => of({req, res: null}))
      )),
      takeUntilDestroyed()
    ).subscribe(({req, res}) => {
      // Only the latest request ever reaches this point
      this.isLoading.set(false);
      if (res) this.applyProductsResponse(res, req.page, req.append);
    });

    // On error keep the previous facets rather than wiping the sidebar
    this.facetsRequest$.pipe(
      switchMap(source$ => source$.pipe(catchError(() => EMPTY))),
      takeUntilDestroyed()
    ).subscribe(groups => this.availableFilters.set(groups));

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
          return this.categoryService.getCategoryBySlug(tag).pipe(
            map(cat => ({
              tag: tag,
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
    ).subscribe(({ tag, brandName, brandAlias, categoryId, categoryName, categoryObj }) => {
      // Redirect to correct language slug if needed
      if (categoryObj && tag) {
        const lang = this.langService.currentLanguage();
        const expectedSlug = this.slugify.categorySlug(categoryObj, lang);
        if (expectedSlug && tag !== expectedSlug) {
          this.router.navigate(['/', lang, 'catalog', expectedSlug], { replaceUrl: true });
          return;
        }
      }

      this.brandName.set(brandName);
      this.brandAlias.set(brandAlias);
      this.categoryName.set(categoryName);
      this.categoryData.set(categoryObj ?? null);
      this.currentCategoryId = categoryId;
      this.setCategory(tag!);
    });
  }

  ngOnDestroy(): void {
    this.metaService.clearAlternateOverride();
  }

  private updateMeta(category: string | null, brand: string | null, alias: string | null, catName: string | null, catData: Category | null, lang: string) {
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
          case 'vs':
            if (isRo) {
              title = "Victoria's Secret Moldova — Lenjerie, Parfumuri, Cosmetice | Secret Room";
              description = "Victoria's Secret în Moldova: sutiene, chiloți, pijamale, parfumuri, loțiuni, spray-uri — originale din SUA. Magazin Secret Room, Chișinău.";
            } else {
              title = "Victoria's Secret Молдова — Бельё, парфюмы, косметика | Secret Room";
              description = "Victoria's Secret в Молдове: бюстгальтеры, трусики, пижамы, парфюмы, лосьоны, спреи — оригинал из США. Магазин Secret Room, Кишинёв.";
            }
            keywords = "victoria secret, victoria secret moldova, lenjerie victoria secret, sutiene victoria secret, parfum victoria secret, victoria secret chisinau, белье victoria secret, бюстгальтеры victoria secret, парфюм victoria secret молдова";
            break;
          case 'bb':
            if (isRo) {
              title = "Bath & Body Works Moldova — Lumânări, Loțiuni, Geluri de Duș | Secret Room";
              description = "Bath & Body Works în Moldova: lumânări cu 3 fitile, loțiuni, geluri de duș, săpunuri spumante — originale din SUA. Magazin Secret Room, Chișinău.";
            } else {
              title = "Bath & Body Works Молдова — Свечи, лосьоны, гели для душа | Secret Room";
              description = "Bath & Body Works в Молдове: свечи с 3 фитилями, лосьоны, гели для душа, пенящееся мыло — оригинал из США. Магазин Secret Room, Кишинёв.";
            }
            keywords = "bath body works, bath body works moldova, lumanari bath body works, lotiuni bath body works, bath body works chisinau, bath body works молдова, свечи bath body works";
            break;
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

    this.metaService.updateTitle(title);
    this.metaService.updateDescription(description);
    this.metaService.updateKeywords(keywords);
    this.metaService.updateCanonicalUrl();

    if (catData) {
      const roSlug = this.slugify.categorySlug(catData, 'ro');
      const ruSlug = this.slugify.categorySlug(catData, 'ru');
      this.metaService.setAlternateOverride(
        `https://secretroom.md/ro/catalog/${roSlug}`,
        `https://secretroom.md/ru/catalog/${ruSlug}`
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
    this.availableFilters.set([]);
    this.loadBrands();
    this.refreshFacets(true);
    this.fetchProducts();
  }

  private reset() {
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
    this.openOverrides.set(new Map());
    this.expandedKeys.set(new Set());
    this.prefetched = null;
  }

  /** Brand options do not depend on the selected filters, so they are loaded once per page. */
  private loadBrands() {
    const categoryId = this.currentCategoryId;
    const tag = this.category();

    let brands$: Observable<{brand: string, brandAlias: string}[]> | null = null;
    if (tag === 'new-arrivals') brands$ = this.productService.getBrandsForNewArrivals();
    else if (tag === 'bestsellers') brands$ = this.productService.getBrandsForBestsellers();
    else if (this.brandName() || !categoryId) this.availableBrands.set([]);
    else brands$ = this.categoryService.getBrandsForCategory(categoryId);

    brands$?.pipe(
      takeUntilDestroyed(this.destroyRef),
      catchError(() => of([]))
    ).subscribe(brands => this.availableBrands.set(brands));
  }

  /**
   * Re-requests the facets with the current selection (counts are disjunctive on the backend).
   * Skipped when the `filters` param is unchanged, unless forced (page / category change).
   * `pending` uses the mobile drawer's uncommitted selection instead of the applied one.
   */
  private refreshFacets(force = false, pending = false) {
    const filters = this.buildFiltersParam(pending ? this.pendingFilters() : this.selectedFilters());
    const brand = (pending ? this.pendingBrand() : this.selectedBrand()) || undefined;
    const key = JSON.stringify([filters ?? null, brand ?? null]);
    if (!force && key === this.lastFacetsKey) return;
    this.lastFacetsKey = key;
    this.facetsRequest$.next(this.loadFacets(filters, brand));
  }

  private loadFacets(filters?: string, brand?: string): Observable<FilterGroup[]> {
    const categoryId = this.currentCategoryId;
    const pageBrand = this.brandName();
    const tag = this.category();

    if (tag === 'new-arrivals') return this.productService.getFiltersForNewArrivals(filters, brand);
    if (tag === 'bestsellers') return this.productService.getFiltersForBestsellers(filters, brand);
    if (pageBrand) return this.brandService.getFiltersForBrand(pageBrand, filters);
    if (!categoryId) return of([]);
    return this.categoryService.getFiltersForCategory(categoryId, filters, brand);
  }

  /** Selection changed: restart the list from page 0 and refresh facets; both cancel their previous request. */
  private onSelectionChanged() {
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
    this.refreshFacets();
  }

  /** Клик по заголовку раздела: переопределяет дефолт. */
  toggleSection(section: FilterSectionView) {
    const next = new Map(this.openOverrides());
    next.set(section.key, !section.open);
    this.openOverrides.set(next);
  }

  /** Раздел, где пользователь что-то выбрал, не должен схлопнуться, когда выбор снят. */
  pinOpen(key: string) {
    if (this.openOverrides().get(key) === true) return;
    this.openOverrides.set(new Map(this.openOverrides()).set(key, true));
  }

  /** «Ещё N» / «Свернуть» — переключает показ всех значений раздела. */
  toggleExpanded(key: string) {
    const next = new Set(this.expandedKeys());
    if (!next.delete(key)) next.add(key);
    this.expandedKeys.set(next);
  }

  /** Убрать чип выбранного фильтра. */
  removeChip(chip: {kind: 'brand' | 'group'; groupSlug: string; valueSlug: string}) {
    if (chip.kind === 'brand') this.selectBrand(null);
    else this.toggleFilter(chip.groupSlug, chip.valueSlug);
  }

  selectBrand(brand: string | null) {
    this.selectedBrand.set(brand);
    this.onSelectionChanged();
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
    this.onSelectionChanged();
  }

  isFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.selectedFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearAllFilters() {
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
    this.onSelectionChanged();
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
    this.refreshFacets(false, true);
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
    this.refreshFacets(false, true);
  }

  isPendingFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.pendingFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearPendingFilters() {
    this.pendingBrand.set(null);
    this.pendingFilters.set(new Map());
    this.refreshPendingCount();
    this.refreshFacets(false, true);
  }

  /** Drawer closed (apply, cancel, backdrop): counts go back to the applied selection; no-op if already there. */
  onFilterDrawerHide() {
    this.refreshFacets();
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
    this.onSelectionChanged();
    this.filterDrawerVisible = false;
  }

  private buildFiltersParam(map: Map<string, Set<string>> = this.selectedFilters()): string | undefined {
    if (map.size === 0) return undefined;

    const parts: string[] = [];
    map.forEach((values, slug) => {
      values.forEach(v => parts.push(`${slug}:${v}`));
    });
    return parts.join(',');
  }

  loadMore(): void {
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
    // An append must never cancel an in-flight fresh load; a fresh load (append = false) is never skipped
    if (append && (this.isLoading() || this.allLoaded())) return;

    const page = append ? this.currentPage + 1 : 0;
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
    this.productsRequest$.next({page, append, source$});
  }

  private applyProductsResponse(res: any, page: number, append: boolean) {
    this.totalProductCount.set(res?.totalElements ?? 0);
    const items = res?.content ?? [];

    if (!items.length) {
      this.allLoaded.set(true);
      return;
    }

    this.currentPage = page;
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
