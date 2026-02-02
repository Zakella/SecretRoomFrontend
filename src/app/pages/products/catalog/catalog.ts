import {Component, HostListener, inject, OnInit, signal} from '@angular/core';
import {CustomTitle} from '../../../shared/components/custom-title/custom-title';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ProductList} from '../../../shared/components/product/product-list/product-list';
import {ProductService} from '../../../@core/api/product';
import {Product} from '../../../entities/product';

@Component({
  selector: 'app-catalog',
    imports: [
        CustomTitle,
        FadeUp,
        ProductList
    ],
  templateUrl: './catalog.html',
  styleUrl: './catalog.scss',
})
export class Catalog implements OnInit {
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
}
