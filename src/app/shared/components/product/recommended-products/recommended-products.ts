import {ChangeDetectionStrategy, Component, input, OnInit, output} from '@angular/core';
import {CarouselModule} from 'primeng/carousel';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {Product} from '../../../../entities/product';
import {MOCK_PRODUCTS} from '../../../../mock/goals';
import {RESPONSIVE_OPTIONS} from '../../../../@core/options/responsive-options';

@Component({
  selector: 'recommended-products',
  imports: [CarouselModule, ButtonModule, TagModule],
  templateUrl: './recommended-products.html',
  styleUrl: './recommended-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendedProducts implements OnInit {
  products: Product[] | undefined;
  responsiveOptions: any[] | undefined;
  protected relatedProducts = input<Product[]>([]);
  protected addTopBag = output<Product>();
  protected addToWishlist = output<Product>();


  ngOnInit() {
    this.products = MOCK_PRODUCTS;
    this.responsiveOptions = RESPONSIVE_OPTIONS;
  }

  protected addToCart() {
/*
    this.addTopBag.emit();
*/
  }
  protected addToWishlistHandler() {
/*
    this.addToWishlist.emit()
*/
  }
}
