import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {ProductCard} from '../product/product-card/product-card';
import {BtnShowMore} from '../buttons/btn-show-more/btn-show-more';
import {BEST_SELLERS} from '../../../mock/best-sellers';

@Component({
  selector: 'app-best-sellers',
  imports: [
    ProductCard,
    BtnShowMore
  ],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestSellers {
  protected readonly categories: string[] = ['SKINCARE', 'MAKEUP', 'HAIR', 'BODY', 'WELLNESS', 'NEW'];
  allProducts = BEST_SELLERS;
  protected selectedCategory= signal<string>('NEW');


  get filteredProducts() {
    if (this.selectedCategory() === 'NEW') {
      return this.allProducts.filter(p => p.isNew);
    }
    return this.allProducts.filter(p => p.category === this.selectedCategory());
  }

  protected selectCategory(cat: string): void {
    this.selectedCategory.set(cat)
  }
}
