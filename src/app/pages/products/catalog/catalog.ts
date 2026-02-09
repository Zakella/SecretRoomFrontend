import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {CustomTitle} from '../../../shared/components/custom-title/custom-title';
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

@Component({
  selector: 'app-catalog',
  imports: [
    CustomTitle,
    FadeUp,
    ProductList
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
  protected products = signal<Product[]>([]);
  protected isLoading = signal(false);
  protected allLoaded = signal(false);

  private currentPage = 0;
  private readonly itemsPerPage = 12;

  constructor() {
    effect(() => {
      const cat = this.category();
      const brand = this.brandName();
      const alias = this.brandAlias();
      const lang = this.langService.currentLanguage();

      if (cat || brand) {
        this.updateMeta(cat, brand, alias, lang);
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
                brandAlias: original?.brandAlias ?? original?.brand ?? slug
              };
            })
          );
        }
        return [{ tag: tag ?? 'vs', brandName: null, brandAlias: null }];
      })
    ).subscribe(({ tag, brandName, brandAlias }) => {
      this.brandName.set(brandName);
      this.brandAlias.set(brandAlias);
      this.setCategory(tag);
    });
  }

  private updateMeta(category: string | null, brand: string | null, alias: string | null, lang: string) {
    let title = 'Catalog | Secret Room';
    let description = 'Catalog de produse Secret Room';
    let keywords = 'cosmetice, lenjerie, moldova, chisinau';

    const isRo = lang === 'ro';
    const displayBrand = alias || brand;

    if (displayBrand) {
      // Dynamic Brand SEO Strategy using the provided template
      if (isRo) {
        title = `${displayBrand} Moldova - Lenjerie și Cosmetice Originale | Secret Room`;
        description = `Descoperă colecția exclusivă ${displayBrand} la Secret Room. Suntem destinația ta de încredere pentru produse originale ${displayBrand} în Moldova. Fie că ești în căutarea celor mai noi lansări sau a produselor clasice, magazinul nostru îți oferă o gamă variată la prețuri competitive. Comandă online produse ${displayBrand} cu livrare rapidă în Chișinău și în toată țara. Garantăm autenticitatea fiecărui produs din portofoliul nostru.`;
      } else {
        title = `${displayBrand} Молдова - Оригинальное белье и косметика | Secret Room`;
        description = `Откройте для себя эксклюзивную коллекцию ${displayBrand} в Secret Room. Мы — ваш надежный источник оригинальной продукции ${displayBrand} в Молдове. Ищете ли вы новинки или классику, наш магазин предлагает широкий ассортимент по конкурентным ценам. Заказывайте продукцию ${displayBrand} онлайн с быстрой доставкой по Кишиневу и всей стране. Мы гарантируем подлинность каждого товара в нашем ассортименте.`;
      }
      keywords = `${displayBrand}, ${displayBrand} moldova, ${displayBrand} chisinau, ${displayBrand} pret, ${displayBrand} online`;
    } else if (category) {
      switch (category) {
        case 'vs':
          title = isRo
            ? "Victoria's Secret Moldova - Lenjerie și Cosmetice Originale | Secret Room"
            : "Victoria's Secret Молдова - Оригинальное белье и косметика | Secret Room";

          description = isRo
            ? "Descoperă colecția exclusivă Victoria's Secret la Secret Room. Suntem destinația ta de încredere pentru produse originale Victoria's Secret în Moldova. Fie că ești în căutarea celor mai noi lansări sau a produselor clasice, magazinul nostru îți oferă o gamă variată la prețuri competitive. Comandă online produse Victoria's Secret cu livrare rapidă în Chișinău și în toată țara. Garantăm autenticitatea fiecărui produs din portofoliul nostru."
            : "Откройте для себя эксклюзивную коллекцию Victoria's Secret в Secret Room. Мы — ваш надежный источник оригинальной продукции Victoria's Secret в Молдове. Ищете ли вы новинки или классику, наш магазин предлагает широкий ассортимент по конкурентным ценам. Заказывайте продукцию Victoria's Secret онлайн с быстрой доставкой по Кишиневу и всей стране. Мы гарантируем подлинность каждого товара в нашем ассортименте.";

          keywords = "victoria's secret moldova, victoria secret chisinau, lenjerie victoria secret, parfumuri victoria secret, виктория сикрет молдова, виктория сикрет кишинев";
          break;

        case 'bb':
          title = isRo
            ? "Bath & Body Works Moldova - Arome și Îngrijire Corp | Secret Room"
            : "Bath & Body Works Молдова - Ароматы и уход за телом | Secret Room";

          description = isRo
            ? "Cumpără produse Bath & Body Works în Moldova. Lumânări parfumate, geluri de duș, loțiuni de corp și parfumuri pentru casă. Arome exclusive la Secret Room."
            : "Купить продукцию Bath & Body Works в Молдове. Ароматические свечи, гели для душа, лосьоны для тела и ароматы для дома. Эксклюзивные ароматы в Secret Room.";

          keywords = "bath and body works moldova, bath & body works chisinau, lumanari bath and body works, creme bath and body works";
          break;

        case 'bestsellers':
          title = isRo ? "Cele mai vândute produse | Secret Room" : "Хиты продаж | Secret Room";
          description = isRo ? "Descoperă cele mai populare produse cosmetice și lenjerie din magazinul nostru." : "Откройте для себя самые популярные косметические средства и белье в нашем магазине.";
          break;

        case 'new-arrivals':
          title = isRo ? "Noutăți - Produse Noi | Secret Room" : "Новинки - Новые поступления | Secret Room";
          description = isRo ? "Ultimele colecții de la Victoria's Secret și Bath & Body Works. Fii prima care le încearcă!" : "Последние коллекции от Victoria's Secret și Bath & Body Works. Будьте первыми, кто их попробует!";
          break;

        case 'sales':
          title = isRo ? "Reduceri și Oferte Speciale | Secret Room" : "Скидки и Специальные Предложения | Secret Room";
          description = isRo ? "Profită de reducerile la produsele tale preferate. Prețuri speciale la Secret Room." : "Воспользуйтесь скидками на ваши любимые товары. Специальные цены в Secret Room.";
          break;
      }
    }

    this.metaService.updateTitle(title);
    this.metaService.updateDescription(description);
    this.metaService.updateKeywords(keywords);

    // Важно: обновляем канонический URL, чтобы избежать дублей
    this.metaService.updateCanonicalUrl();
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

    this.loadByCategory(category!, page, this.itemsPerPage)
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
      });
  }

  private loadByCategory(category: string, page: number, size: number) {
    switch (category) {
      case 'vs':
      case 'bb':
        return this.productService.getAllProductsByBrand(category, page, size);
      case 'bestsellers':
        return this.productService.getBestSellers(page + 1, size);
      case 'new-arrivals':
        return this.productService.getNewArrivals(page + 1, size);
      case 'sales':
        return this.productService.getSales(page + 1, size);
      case 'hero':
       return  this.heroService.getHeroProductsById();
     case 'brand':
        return this.brandService.getProductsByBrand(this.brandName()!, page, size);
      default:
        return this.categoryService.getProductsByGroupId(category, page, size);
    }
  }
}
