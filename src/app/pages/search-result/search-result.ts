import {Component, inject, OnInit, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ActivatedRoute} from '@angular/router';
import {Meta} from '@angular/platform-browser';
import {ProductService} from '../../@core/api/product';
import {ProductList} from '../../shared/components/product/product-list/product-list';
import {Product} from '../../entities/product';
import {TranslocoPipe} from '@ngneat/transloco';
import {GoogleAnalytics} from '../../@core/services/google-analytics';
import {MetaService} from '../../@core/services/meta.service';

@Component({
  selector: 'app-search-result',
  imports: [
    CommonModule,
    FormsModule,
    ProductList,
    TranslocoPipe,
  ],
  templateUrl: './search-result.html',
  styleUrl: './search-result.scss'
})
export class SearchResult implements OnInit {
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private ga = inject(GoogleAnalytics);
  private metaService = inject(MetaService);
  private meta = inject(Meta);

  viewMode: 'grid' | 'list' = 'grid';
  products = signal<Product[]>([]);
  query = signal('');
  totalElements = signal(0);
  loading = signal(false);
  hasMore = signal(false);
  private page = 0;
  private pageSize = 12;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const q = params.get('query') || '';
      this.query.set(q);
      this.page = 0;
      this.products.set([]);
      this.metaService.updateTitle(`${q} — Secret Room`);
      this.metaService.updateDescription(`Результаты поиска «${q}» в магазине Secret Room Moldova.`);
      this.meta.updateTag({name: 'robots', content: 'noindex, follow'});
      if (q.trim()) {
        this.loadProducts();
        this.trackSearch(q);
      }
    });
  }

  loadProducts() {
    this.loading.set(true);
    this.productService.smartSearch(this.query(), this.page, this.pageSize).subscribe({
      next: res => {
        if (this.page === 0) {
          this.products.set(res.content);
        } else {
          this.products.update(prev => [...prev, ...res.content]);
        }
        this.totalElements.set(res.totalElements);
        this.hasMore.set((this.page + 1) * this.pageSize < res.totalElements);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  loadMore() {
    this.page++;
    this.loadProducts();
  }

  private trackSearch(query: string) {
    this.ga.send({
      event: 'search',
      category: 'engagement',
      label: query
    });
  }
}
