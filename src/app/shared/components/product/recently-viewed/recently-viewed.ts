import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {CarouselModule} from 'primeng/carousel';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {CartUi} from '../../cart/services/cart';
import {FavoritesService} from '../../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {RecentlyViewedService} from '../../../../@core/services/recently-viewed.service';
import {TranslocoPipe} from '@ngneat/transloco';
import {RouterLink} from '@angular/router';
import {Slugify} from '../../../../@core/services/slugify';
import {Language} from '../../../../@core/services/language';

@Component({
  selector: 'recently-viewed',
  imports: [CarouselModule, ButtonModule, TagModule, LocalizedNamePipe, TranslocoPipe, RouterLink],
  templateUrl: './recently-viewed.html',
  styleUrl: './recently-viewed.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecentlyViewed implements OnInit {
  private recentlyViewedService = inject(RecentlyViewedService);
  private cartService = inject(CartUi);
  public favoritesService = inject(FavoritesService);
  public slugify = inject(Slugify);
  public langService = inject(Language);

  products = this.recentlyViewedService.products;

  // Custom responsive options for smaller items
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
    },
    {
      breakpoint: '480px',
      numVisible: 2,
      numScroll: 1
    }
  ];

  ngOnInit() {
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
