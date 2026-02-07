import {
  ChangeDetectionStrategy,
  Component,
  computed,
  HostListener,
  Inject,
  inject,
  OnInit, PLATFORM_ID,
  signal
} from '@angular/core';
import {NavigationEnd, Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {TranslocoPipe} from '@ngneat/transloco';
import {FormsModule} from '@angular/forms';
import {CategoryService} from '../../@core/api/category';
import {Brand, Category} from '../../entities/category';
import {toSignal} from '@angular/core/rxjs-interop';
import {filter, map} from 'rxjs/operators';
import {isPlatformBrowser, NgStyle, NgTemplateOutlet, UpperCasePipe} from '@angular/common';
import {BrandService} from '../../@core/api/brand';
import {SearchService} from '../../@core/services/search';
import {SearchDropdown} from './search-dropdown/search-dropdown';


@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    TranslocoPipe,
    FormsModule,
    UpperCasePipe,
    NgStyle,
    NgTemplateOutlet,
    SearchDropdown,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Header implements OnInit {
  private cartService = inject(CartUi);
  private langService = inject(Language);
  private router = inject(Router);
  private categoryService = inject(CategoryService);
  private brandService = inject(BrandService);
  public searchService = inject(SearchService);
  public activeLang = this.langService.currentLanguage;
  public cartCount = this.cartService.cartCount;
  public languages = ['ro', 'ru'];
  headerItems = signal<any[] | null>([]);
  activeBrand = signal<Brand | null>(null);
  query = signal('');
  activeCategory = signal<Category | null>(null);
  navHovered = signal(false);
  isHidden = false;
  isMinBrands = signal<boolean>(false)
  brands = signal<Brand[]>([]);

  private currentUrl = toSignal(
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      map((event: NavigationEnd) => event.urlAfterRedirects)
    ),
    { initialValue: this.router.url }
  );

  isCheckoutPage = computed(() => this.currentUrl()?.includes('/checkout'));

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngOnInit(): void {
    this.getBrands();
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

  onSearchInput(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.query.set(value);
    this.searchService.search(value);
  }

  onSearch() {
    const q = this.query().trim();
    if (!q) return;
    this.searchService.clear();
    this.router.navigate([this.activeLang(), 'search', q]);
  }

  closeSearchDropdown() {
    this.searchService.showDropdown.set(false);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.search-bar') && !target.closest('search-dropdown')) {
      this.searchService.showDropdown.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.searchService.showDropdown.set(false);
  }


  getBrands(){
    this.brandService.gerAllBrands().subscribe(brands => {
      this.brands.set(brands);
      this.activeBrand.set(brands[0]);
    })
  }

  getCategories() {
    this.categoryService.getCategories().subscribe(categories => {
      if (!categories?.length) {
        this.headerItems.set([]);
        this.activeBrand.set(null);
        this.isMinBrands.set(true);
        return;
      }
      this.headerItems.set(categories);
      this.isMinBrands.set(this.headerItems()!.length <= 5);
    });
  }

  goToBrandList(brand :Brand){
    this.activeBrand.set(brand);
    this.brandService.brand.set(brand.brand)
    this.router.navigate([this.activeLang(), 'catalog', 'brand']);

  }


  @HostListener('window:scroll')
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop || 0;
      this.isHidden = currentScroll > 0;
    }
    }
}
