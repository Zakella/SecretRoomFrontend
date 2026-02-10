import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {CarouselModule} from 'primeng/carousel';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {CartUi} from '../../cart/services/cart';
import {FavoritesService} from '../../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {RecentlyViewedService} from '../../../../@core/services/recently-viewed.service';
import {Router} from '@angular/router';
import {Slugify} from '../../../../@core/services/slugify';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';
import {ProductPrice} from '../product-price/product-price';

@Component({
  selector: 'recently-viewed',
  imports: [CarouselModule, LocalizedNamePipe, TranslocoPipe, ProductPrice],
  templateUrl: './recently-viewed.html',
  styleUrl: './recently-viewed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentlyViewed {
  private recentlyViewedService = inject(RecentlyViewedService);
  private cartService = inject(CartUi);
  private router = inject(Router);
  public favoritesService = inject(FavoritesService);
  public slugify = inject(Slugify);
  public langService = inject(Language);

  excludeProductId = input<string>('');

  filteredProducts = computed(() => {
    const excludeId = this.excludeProductId();
    const all = this.recentlyViewedService.products();
    return excludeId ? all.filter(p => p.id !== excludeId) : all;
  });

  responsiveOptions = [
    {
      breakpoint: '1199px',
      numVisible: 4,
      numScroll: 1
    },
    {
      breakpoint: '991px',
      numVisible: 3,
      numScroll: 1
    },
    {
      breakpoint: '767px',
      numVisible: 2,
      numScroll: 1
    }
  ];

  protected addToCart(product: Product) {
    const cartItem = new CartItem(product, 1);
    this.cartService.addToCart(cartItem);
  }

  protected goToProduct(product: Product) {
    const lang = this.langService.currentLanguage();
    const slug = this.slugify.transform(product.name || '');
    this.router.navigate(['/', lang, 'product', product.id, slug]);
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
