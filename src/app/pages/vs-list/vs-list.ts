import {ChangeDetectionStrategy, Component, HostListener, inject, OnInit, signal} from '@angular/core';
import {ProductList} from '../../shared/components/product/product-list/product-list';
import {ProductService} from '../../@core/api/product';
import {Product} from '../../entities/product';
import {CustomTitle} from '../../shared/components/custom-title/custom-title';
import {StoriesComponent} from '../../shared/components/stories/stories.component';
import {FadeUp} from '../../@core/directives/fade-up';
import {FilterConfig, ProductFilter} from '../../shared/components/product/product-filter/product-filter';

@Component({
  selector: 'app-vs-list',
  imports: [ProductList, CustomTitle, StoriesComponent, FadeUp, ProductFilter],
  templateUrl: './vs-list.html',
  styleUrl: './vs-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VsList implements OnInit {
  private productService = inject(ProductService);
  protected products = signal<Product[]>([]);
  protected isLoading = signal<boolean>(false);
  private  currentPage = 1;
  private readonly itemsPerPage = 12;
  allLoaded = signal<boolean>(false);

  ngOnInit(): void {
    this.fetchProducts();
  }

  private fetchProducts(append = false): void {
    if (this.isLoading() || this.allLoaded()) return;

    this.isLoading.set(true);
    const page = append ? this.currentPage + 1 : 0;

    this.productService.getAllProductsByBrand('vs', page, this.itemsPerPage)
      .subscribe({
        next: res => {
          if (!res || !res.content?.length) {
            this.allLoaded.set(true);
            return;
          }

          if (append) {
            this.currentPage++;
            this.products.set([...this.products(), ...res.content]);
          } else {
            this.currentPage = 0;
            this.products.set(res.content);
          }
        },
        error: err => console.error(err),
        complete: () => this.isLoading.set(false)
      });
  }


  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollPosition = window.innerHeight + window.scrollY;
    const threshold = 500;
    const pageHeight = document.documentElement.scrollHeight;

    if (pageHeight - scrollPosition < threshold) {
      this.fetchProducts(true);
    }
  }

  filters = [
    { type: 'text', field: 'name', label: 'Название' },
    { type: 'select', field: 'status', label: 'Статус', options: [
        { label: 'Активен', value: 'active' },
        { label: 'Неактивен', value: 'inactive' }
      ]},
    { type: 'date', field: 'createdAt', label: 'Дата создания' }
  ] as const satisfies FilterConfig[];
}
