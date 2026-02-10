import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {toObservable, takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {switchMap, of, filter} from 'rxjs';
import {CarouselModule} from 'primeng/carousel';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {RESPONSIVE_OPTIONS} from '../../../../@core/options/responsive-options';
import {RecommendedProductService} from './recommended-product-service';
import {CartUi} from '../../cart/services/cart';
import {FavoritesService} from '../../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'recommended-products',
  imports: [CarouselModule, ButtonModule, TagModule, LocalizedNamePipe, TranslocoPipe],
  templateUrl: './recommended-products.html',
  styleUrl: './recommended-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendedProducts {
  private recommendedService = inject(RecommendedProductService);
  private cartService = inject(CartUi);
  public favoritesService = inject(FavoritesService);
  products = signal<Product[]>([]);
  responsiveOptions = RESPONSIVE_OPTIONS;
  protected relatedProducts = input<Product[]>([]);
  productId = input<string>('');
  protected addTopBag = output<Product>();
  protected addToWishlist = output<Product>();

  constructor() {
    toObservable(this.productId).pipe(
      filter(id => !!id),
      switchMap(id => this.recommendedService.getRecommendedProducts(id)),
      takeUntilDestroyed()
    ).subscribe(recommended => {
      const mapped = recommended
        .map(r => r.product)
        .filter((p): p is Product => p !== null);
      this.products.set(mapped);
    });
  }

  protected addToCart(product: Product) {
    const cartItem = new CartItem(product, 1);
    this.cartService.addToCart(cartItem);
  }

  protected toggleFavorite(product: Product) {
    if (product.id) {
      this.favoritesService.toggle(product.id);
    }
  }

  protected isFavorite(product: Product): boolean {
    return product.id ? this.favoritesService.isFavorite(product.id) : false;
  }
}