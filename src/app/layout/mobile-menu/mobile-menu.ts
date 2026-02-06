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

@Component({
  selector: 'mobile-menu',
  imports: [
    RouterLink,
    RouterLinkActive,
    DrawerModule,
    ButtonModule,
    FormsModule,
    TranslocoPipe,
    UpperCasePipe
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

  isAuth = this.authService.logged;
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
    this.brandService.brand.set(brand.brand);
    this.router.navigate([this.activeLang(), 'catalog', 'brand']);
    this.visible = false; // Close drawer
  }

  goToCategory(category: Category) {
    // If category has children, we might want to show them or navigate to parent
    // For now, let's navigate to catalog with category id
    this.router.navigate([this.activeLang(), 'catalog', category.id]);
    this.visible = false;
  }
}
