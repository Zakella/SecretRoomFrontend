import {Component, inject, ViewEncapsulation, OnInit, signal} from '@angular/core';
import {Router, RouterLink, RouterLinkActive} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {DrawerModule} from 'primeng/drawer';
import {ButtonModule} from 'primeng/button';
import {FormsModule} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';
import {Authentication} from '../../@core/auth/authentication';
import {UpperCasePipe} from '@angular/common';
import {BrandService} from '../../@core/api/brand';
import {Brand, Category} from '../../entities/category';
import {CategoryService} from '../../@core/api/category';
import {SearchService} from '../../@core/services/search';
import {FavoritesService} from '../../@core/services/favorites';
import {Product} from '../../entities/product';
import {LocalizedNamePipe} from '../../shared/pipes/localized-name.pipe';
import {Slugify} from '../../@core/services/slugify';
import {ProductPrice} from '../../shared/components/product/product-price/product-price';

@Component({
  selector: 'mobile-menu',
  imports: [
    RouterLink,
    RouterLinkActive,
    DrawerModule,
    ButtonModule,
    FormsModule,
    TranslocoPipe,
    UpperCasePipe,
    LocalizedNamePipe,
    ProductPrice
  ],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  encapsulation: ViewEncapsulation.None
})
export class MobileMenu  implements OnInit{
  public router = inject(Router);
  private langService = inject(Language)
  private cartService = inject(CartUi);
  private authService = inject(Authentication)
  private brandService = inject(BrandService);
  private categoryService = inject(CategoryService);
  public searchService = inject(SearchService);
  public favoritesService = inject(FavoritesService);
  private slugify = inject(Slugify);

  isAuth = this.authService.logged;
  mobileQuery = signal('');
  public activeLang = this.langService.currentLanguage
  public cartCount =  this.cartService.cartCount;
  visible: boolean = false;
  user = signal<any>(null)
  languages = ['ro', 'ru'];
  brands = signal<Brand[]>([]);
  categories = signal<Category[]>([]);

  ngOnInit(): void {
    this.user.set( this.getUserInitials());
    this.getBrands();
    this.getCategories();
  }


  openCart() {
    this.cartService.open();
  }

  openSearch() {
    this.visible = true;
    setTimeout(() => {
      const input = document.querySelector('.search-input-wrapper input') as HTMLInputElement;
      input?.focus();
    }, 300);
  }

  getUserInitials(): string {
    const user = this.authService.getUserDetails();

    const first = user?.givenName?.charAt(0) ?? '';
    const last = user?.familyName?.charAt(0) ?? '';
    return (first + last).toUpperCase();
  }

  setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }

  getBrands() {
    this.brandService.gerAllBrands().subscribe(brands => {
      this.brands.set(brands);
    });
  }

  getCategories() {
    this.categoryService.getCategories().subscribe(categories => {
      if (categories) {
        this.categories.set(categories);
      }
    });
  }

  goToBrandList(brand: Brand) {
    this.router.navigate([this.activeLang(), 'catalog', 'brand', this.brandService.toSlug(brand.brand)]);
    this.visible = false;
  }

  goToCategory(category: Category) {
    const slug = this.slugify.transform(category.name);
    const identifier = slug || category.id;
    this.router.navigate([this.activeLang(), 'catalog', identifier]);
    this.visible = false;
  }

  goToStaticCategory(tag: string) {
    this.router.navigate([this.activeLang(), 'catalog', tag]);
    this.visible = false;
  }

  onMobileSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.mobileQuery.set(value);
    this.searchService.search(value);
  }

  onMobileSearch() {
    const q = this.mobileQuery().trim();
    if (!q) return;
    this.searchService.clear();
    this.visible = false;
    this.router.navigate([this.activeLang(), 'search', q]);
  }

  goToProductFromSearch(product: Product) {
    this.searchService.clear();
    this.mobileQuery.set('');
    this.visible = false;
    this.router.navigate(this.slugify.productUrl(this.activeLang(), product.id!, product.name ?? ''));
  }

  showAllMobileResults() {
    const q = this.mobileQuery().trim();
    if (!q) return;
    this.searchService.clear();
    this.mobileQuery.set('');
    this.visible = false;
    this.router.navigate(['/', this.activeLang(), 'search', q]);
  }
}
