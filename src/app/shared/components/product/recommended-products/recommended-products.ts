import {ChangeDetectionStrategy, Component, inject, input, output, signal} from '@angular/core';
import {toObservable, takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {switchMap, of, filter} from 'rxjs';
import {RouterLink} from '@angular/router';
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
import {Slugify} from '../../../../@core/services/slugify';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';
import {ProductPrice} from '../product-price/product-price';

@Component({
  selector: 'recommended-products',
  imports: [CarouselModule, ButtonModule, TagModule, LocalizedNamePipe, TranslocoPipe, ProductPrice, RouterLink],
  templateUrl: './recommended-products.html',
  styleUrl: './recommended-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendedProducts {
  private recommendedService = inject(RecommendedProductService);
  private cartService = inject(CartUi);
  private slugify = inject(Slugify);
  private langService = inject(Language);
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
      switchMap(id => this.recommendedService.getSmartRecommendations(id)),
      takeUntilDestroyed()
    ).subscribe(products => {
      this.products.set(products);
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

  protected getProductUrl(product: Product): string[] | null {
    const id = product.appId || product.id;
    if (!id) return null;
    return this.slugify.productUrl(this.langService.currentLanguage(), id, product.name ?? '');
  }
}