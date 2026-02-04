import {Component, inject, OnInit, signal} from '@angular/core';
import {CustomTitle} from '../../../shared/components/custom-title/custom-title';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';
import {ActivatedRoute} from '@angular/router';
import {finalize, map} from 'rxjs';
import {HeroService} from '../../../@core/api/hero';
import {BrandService} from '../../../@core/api/brand';

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
  protected category = signal<string | null>(null);
  protected products = signal<Product[]>([]);
  protected isLoading = signal(false);
  protected allLoaded = signal(false);

  private currentPage = 0;
  private readonly itemsPerPage = 12;

  ngOnInit(): void {
    this.route.paramMap
      .pipe(map(p => p.get('tag') ?? 'vs'))
      .subscribe(tag => this.setCategory(tag));
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
      case 'hero':
       return  this.heroService.getHeroProductsById();
     case 'brand':
        return this.brandService.geProductsByBrand()
 /*      case 'category':
        return*/
      default:
        return this.productService.getAllProductsByBrand('vs', page, size);
    }
  }
}

