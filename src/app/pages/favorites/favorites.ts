import {Component, inject, OnInit, signal} from '@angular/core';
import {FavoritesService} from '../../@core/services/favorites';
import {ProductService} from '../../@core/api/product';
import {Product} from '../../entities/product';
import {ProductList} from '../../shared/components/product/product-list/product-list';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-favorites',
  imports: [ProductList, TranslocoPipe],
  templateUrl: './favorites.html',
  styleUrl: './favorites.scss',
})
export class Favorites implements OnInit {
  private favoritesService = inject(FavoritesService);
  private productService = inject(ProductService);

  products = signal<Product[]>([]);
  loading = signal(false);

  ngOnInit() {
    this.loadFavorites();
  }

  loadFavorites() {
    const ids = this.favoritesService.getAll();
    if (!ids.length) return;

    this.loading.set(true);
    let loaded: Product[] = [];
    let remaining = ids.length;

    for (const id of ids) {
      this.productService.getProductById(id).subscribe({
        next: product => {
          loaded.push(product);
          remaining--;
          if (remaining === 0) {
            this.products.set(loaded);
            this.loading.set(false);
          }
        },
        error: () => {
          remaining--;
          if (remaining === 0) {
            this.products.set(loaded);
            this.loading.set(false);
          }
        }
      });
    }
  }
}
