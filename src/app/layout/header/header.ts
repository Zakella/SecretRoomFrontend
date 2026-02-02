import {ChangeDetectionStrategy, Component, computed, HostListener, inject, OnInit, signal} from '@angular/core';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {TranslocoPipe} from '@ngneat/transloco';
import {FormsModule} from '@angular/forms';
import {CategoryService} from '../../@core/api/category';
import {Brand, Category} from '../../entities/category';
import {NgIf, NgStyle, NgTemplateOutlet, UpperCasePipe} from '@angular/common';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs/operators';


@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    TranslocoPipe,
    FormsModule,
    UpperCasePipe,
    NgStyle,
    NgTemplateOutlet,
    NgIf
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header implements OnInit {
  private cartService = inject(CartUi);
  private langService = inject(Language);
  protected readonly Object = Object;
  public activeLang = this.langService.currentLanguage;
  public cartCount = this.cartService.cartCount;
  public languages = ['ru', 'ro'];
  headerItems = signal<Brand[] | null>([]);
  activeBrand = signal<Brand | null>(null);
  query = signal('');
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  activeCategory = signal<Category | null>(null);
  navHovered = signal(false);
  isHidden = false;
  isMinBrands = signal<boolean>(false)

  // Check if current page is checkout
  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  isCheckoutPage = computed(() => this.currentUrl()?.includes('/checkout'));


  ngOnInit(): void {
    this.getCategories();
  }

  public openCart() {
    this.cartService.open();
  }


  showDropdown(category: Category) {
    if (!category.children?.length) {
      this.activeCategory.set(null);
      return;
    }
    this.activeCategory.set(category);
  }

  closeDropdown() {
    this.activeCategory.set(null);
    this.navHovered.set(false);
  }

  public setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }

  onSearch() {
    const q = this.query().trim();
    if (!q) return;

    this.router.navigate([this.activeLang(), 'search', q]);
  }

  setActive(brand: Brand) {
    this.activeBrand.set(brand);
  }

  getCategories() {
    this.categoryService.getCategories().subscribe(categories => {
      if (!categories?.length) {
        this.headerItems.set([]);
        this.activeBrand.set(null);
        this.isMinBrands.set(true);
        return;
      }

      this.headerItems.set(categories.slice(0, 5));
      this.activeBrand.set(categories[0]);

      this.isMinBrands.set(this.headerItems()!.length <= 5);
    });
  }


  @HostListener('window:scroll')
  onWindowScroll() {
    const currentScroll =
      window.pageYOffset || document.documentElement.scrollTop || 0;

    this.isHidden = currentScroll > 0;
  }
}
