import {ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';
import {FilterGroup} from '../../../entities/filter-group';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {catchError, finalize, map, switchMap, take} from 'rxjs';
import {HeroService} from '../../../@core/api/hero';
import {BrandService} from '../../../@core/api/brand';
import {CategoryService} from '../../../@core/api/category';
import {MetaService} from '../../../@core/services/meta.service';
import {Language} from '../../../@core/services/language';
import {Slugify} from '../../../@core/services/slugify';
import {Category} from '../../../entities/category';
import {of} from 'rxjs';
import {TranslocoPipe} from '@ngneat/transloco';
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

  protected hasFilters = computed(() => {
    return this.availableBrands().length > 1 || this.availableFilters().length > 0;
  });

  private currentCategoryId: string | null = null;
  private currentHeroId: number | null = null;
  private currentPage = 0;
  private readonly itemsPerPage = 12;

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
      if (isRo) {
        title = `${displayBrand} Moldova — Produse Originale | Secret Room`;
        description = `${displayBrand} în Moldova: lenjerie, parfumuri, loțiuni, cosmetice originale. Magazin Secret Room, livrare în Chișinău și toată țara.`;
      } else {
        title = `${displayBrand} Молдова — Оригинальная продукция | Secret Room`;
        description = `${displayBrand} в Молдове: бельё, парфюмы, лосьоны, косметика — оригинал. Магазин Secret Room, доставка по Кишинёву и всей стране.`;
      }
      keywords = `${displayBrand}, ${displayBrand} moldova, ${displayBrand} chisinau, ${displayBrand} pret, купить ${displayBrand} молдова, ${displayBrand} кишинев`;
    } else if (category) {
      const localizedName = catData
        ? (isRo ? catData.nameRo : catData.nameRu) || catData.name
        : catName;

      if (localizedName) {
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
    this.loadFilters();
    this.fetchProducts();
  }

  private reset() {
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
  }

  private loadFilters() {
    const categoryId = this.currentCategoryId;
    const brand = this.brandName();

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
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
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
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
  }

  isFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.selectedFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearAllFilters() {
    this.selectedBrand.set(null);
    this.selectedFilters.set(new Map());
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
  }

  openFilterDrawer() {
    // Copy current state → pending
    this.pendingBrand.set(this.selectedBrand());
    const copy = new Map<string, Set<string>>();
    this.selectedFilters().forEach((vals, key) => copy.set(key, new Set(vals)));
    this.pendingFilters.set(copy);
    this.filterDrawerVisible = true;
  }

  selectPendingBrand(brand: string | null) {
    this.pendingBrand.set(brand);
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
  }

  isPendingFilterSelected(filterSlug: string, valueSlug: string): boolean {
    return this.pendingFilters().get(filterSlug)?.has(valueSlug) ?? false;
  }

  clearPendingFilters() {
    this.pendingBrand.set(null);
    this.pendingFilters.set(new Map());
  }

  applyFiltersAndClose() {
    // Copy pending → actual and fetch
    this.selectedBrand.set(this.pendingBrand());
    const copy = new Map<string, Set<string>>();
    this.pendingFilters().forEach((vals, key) => copy.set(key, new Set(vals)));
    this.selectedFilters.set(copy);
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
    this.fetchProducts();
    this.filterDrawerVisible = false;
  }

  private buildFiltersParam(): string | undefined {
    const map = this.selectedFilters();
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

  fetchProducts(append = false) {
    if (this.isLoading() || this.allLoaded()) return;

    this.isLoading.set(true);

    const page = append ? this.currentPage + 1 : 0;
    const category = this.category();
    const categoryIdentifier = this.currentCategoryId || category;

    this.loadByCategory(categoryIdentifier!, page, this.itemsPerPage)
      .pipe(finalize(() => this.isLoading.set(false)))
      .subscribe(res => {
        this.totalProductCount.set(res?.totalElements ?? 0);
        const items = res?.content ?? [];

        if (!items.length) {
          this.allLoaded.set(true);
          return;
        }

        this.currentPage = page;
        this.products.set(
          append ? [...this.products(), ...items] : items
        );
        this.setItemListJsonLd(this.products());
      });
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

  private loadByCategory(category: string, page: number, size: number) {
    switch (category) {
      case 'vs':
      case 'bb':
        return this.productService.getAllProductsByBrand(category, page, size);
      case 'bestsellers':
        return this.productService.getBestSellers(page, size);
      case 'new-arrivals':
        return this.productService.getNewArrivals(page, size);
      case 'sales':
        return this.productService.getSales(page, size);
      case 'hero':
        return this.heroService.getHeroProductsById(this.currentHeroId!, page, size);
     case 'brand':
        return this.brandService.getProductsByBrand(this.brandName()!, page, size, this.buildFiltersParam());
      default:
        return this.categoryService.getProductsByGroupId(category, page, size, this.selectedBrand() || undefined, this.buildFiltersParam());
    }
  }
}
