import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';
import {ActivatedRoute} from '@angular/router';
import {finalize, map, switchMap} from 'rxjs';
import {HeroService} from '../../../@core/api/hero';
import {BrandService} from '../../../@core/api/brand';
import {CategoryService} from '../../../@core/api/category';
import {MetaService} from '../../../@core/services/meta.service';
import {Language} from '../../../@core/services/language';
import {of} from 'rxjs';
import {TranslocoPipe} from '@ngneat/transloco';
import {EmptyState} from '../../states/empty-state/empty-state';

@Component({
  selector: 'app-catalog',
  imports: [
    FadeUp,
    ProductList,
    TranslocoPipe,
    EmptyState
  ],
  providers: [ProductService],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog implements OnInit {
  private productService = inject(ProductService);
  private route = inject(ActivatedRoute);
  private heroService = inject(HeroService);
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  private metaService = inject(MetaService);
  private langService = inject(Language);

  protected category = signal<string | null>(null);
  protected brandName = signal<string | null>(null);
  protected brandAlias = signal<string | null>(null);
  protected categoryName = signal<string | null>(null); // New signal for display name
  protected products = signal<Product[]>([]);
  protected isLoading = signal(false);
  protected allLoaded = signal(false);

  private currentCategoryId: string | null = null;
  private currentPage = 0;
  private readonly itemsPerPage = 12;

  constructor() {
    effect(() => {
      const cat = this.category();
      const brand = this.brandName();
      const alias = this.brandAlias();
      const catName = this.categoryName();
      const lang = this.langService.currentLanguage();

      if (cat || brand) {
        this.updateMeta(cat, brand, alias, catName, lang);
      }
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      map(p => ({ tag: p.get('tag'), slug: p.get('brandName') })),
      switchMap(({ tag, slug }) => {
        if (slug) {
          return this.brandService.gerAllBrands().pipe(
            map(brands => {
              const original = brands.find(b => this.brandService.toSlug(b.brand) === slug);
              return {
                tag: 'brand',
                brandName: original?.brand ?? slug,
                brandAlias: original?.brandAlias ?? original?.brand ?? slug,
                categoryId: null,
                categoryName: null
              };
            })
          );
        }

        const staticCategories = ['vs', 'bb', 'bestsellers', 'new-arrivals', 'sales', 'hero'];
        if (tag && staticCategories.includes(tag)) {
          return of({ tag: tag, brandName: null, brandAlias: null, categoryId: null, categoryName: null });
        }

        if (tag) {
          return this.categoryService.getCategoryBySlug(tag).pipe(
            map(cat => ({
              tag: tag,
              brandName: null,
              brandAlias: null,
              categoryId: cat ? cat.id.toString() : tag,
              categoryName: cat ? cat.name : null
            }))
          );
        }

        return of({ tag: 'vs', brandName: null, brandAlias: null, categoryId: null, categoryName: null });
      })
    ).subscribe(({ tag, brandName, brandAlias, categoryId, categoryName }) => {
      this.brandName.set(brandName);
      this.brandAlias.set(brandAlias);
      this.categoryName.set(categoryName);
      this.currentCategoryId = categoryId;
      this.setCategory(tag!);
    });
  }

  private updateMeta(category: string | null, brand: string | null, alias: string | null, catName: string | null, lang: string) {
    let title = 'Catalog | Secret Room';
    let description = 'Catalog de produse Secret Room';
    let keywords = 'cosmetice, lenjerie, moldova, chisinau';

    const isRo = lang === 'ro';
    const displayBrand = alias || brand;

    if (displayBrand) {
      if (isRo) {
        title = `${displayBrand} Moldova - Lenjerie și Cosmetice Originale | Secret Room`;
        description = `Descoperă colecția exclusivă ${displayBrand} la Secret Room. Suntem destinația ta de încredere pentru produse originale ${displayBrand} în Moldova.`;
      } else {
        title = `${displayBrand} Молдова - Оригинальное белье и косметика | Secret Room`;
        description = `Откройте для себя эксклюзивную коллекцию ${displayBrand} в Secret Room. Мы — ваш надежный источник оригинальной продукции ${displayBrand} в Молдове.`;
      }
      keywords = `${displayBrand}, ${displayBrand} moldova, ${displayBrand} chisinau, ${displayBrand} pret, ${displayBrand} online`;
    } else if (category) {
      // Use real category name if available
      if (catName) {
        title = isRo
          ? `${catName} - Cumpără Online în Moldova | Secret Room`
          : `${catName} - Купить Онлайн в Молдове | Secret Room`;
        description = isRo
          ? `Comandă ${catName} la prețuri avantajoase. Livrare rapidă în Chișinău și toată țara.`
          : `Заказывайте ${catName} по выгодным ценам. Быстрая доставка по Кишиневу и всей стране.`;
      } else {
        switch (category) {
          case 'vs':
            title = isRo
              ? "Produse originale de la Victoria's Secret Moldova - Lenjerie și Cosmetice Originale | Secret Room"
              : "Оригинальные продукты от Victoria's Secret Молдова - Оригинальное белье и косметика | Secret Room";
            break;
          case 'bb':
            title = isRo
              ? "Bath & Body Works Moldova - Arome și Îngrijire Corp | Secret Room"
              : "Bath & Body Works Молдова - Ароматы и уход за телом | Secret Room";
            break;
          case 'bestsellers':
            title = isRo ? "Cele mai vândute produse | Secret Room" : "Хиты продаж | Secret Room";
            break;
          case 'new-arrivals':
            title = isRo ? "Noutăți - Produse Noi | Secret Room" : "Новинки - Новые поступления | Secret Room";
            break;
          case 'sales':
            title = isRo ? "Reduceri și Oferte Speciale | Secret Room" : "Скидки и Специальные Предложения | Secret Room";
            break;
        }
      }
    }

    this.metaService.updateTitle(title);
    this.metaService.updateDescription(description);
    this.metaService.updateKeywords(keywords);
    this.metaService.updateCanonicalUrl();

    this.metaService.setJsonLd({
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": title,
      "description": description
    }, 'collection');
  }

  private setCategory(tag: string) {
    this.category.set(tag);
    this.reset();
    this.fetchProducts();
  }

  private reset() {
    this.currentPage = 0;
    this.allLoaded.set(false);
    this.products.set([]);
  }

  loadMore(): void {
    this.currentPage++;
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
        return this.heroService.getHeroProductsById(page, size);
     case 'brand':
        return this.brandService.getProductsByBrand(this.brandName()!, page, size);
      default:
        return this.categoryService.getProductsByGroupId(category, page, size);
    }
  }
}
