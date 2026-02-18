import {ChangeDetectionStrategy, Component, computed, inject, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {CartUi} from '../../cart/services/cart';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {Size} from '../../../../entities/size';
import {TranslocoPipe} from '@ngneat/transloco';
import { SkeletonModule } from 'primeng/skeleton';
import {AnalyticEvent} from '../../../../@core/directives/analytic-event';
import {FavoritesService} from '../../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {Slugify} from '../../../../@core/services/slugify';
import {ProductPrice} from '../product-price/product-price';

@Component({
  selector: 'product-card',
  imports: [SkeletonModule, TranslocoPipe, AnalyticEvent, LocalizedNamePipe, ProductPrice, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
  private langService = inject(Language);
  private cartService = inject(CartUi);
  private slugify = inject(Slugify);
  public favoritesService = inject(FavoritesService);
  public activeLang = this.langService.currentLanguage
  product = input<Product>();
  readonly imageUrl = input<string>('');
  readonly title = input<string>();
  readonly price = input<number>();
  readonly isBestSeller = input<boolean>(false);
  readonly isNew = input<boolean>(false);
  readonly oldPrice = input<number | null>(null);
  readonly discountPercent = input<number>(0);
  readonly showOptions = input<boolean>();

  hasDiscount = computed(() => {
    const old = this.oldPrice();
    const current = this.price();
    return old !== null && old > 0 && current !== undefined && old > current;
  });

  hoverImageUrl = computed(() => {
    const images = this.product()?.productImagesWebStore;
    if (images && images.length > 1) {
      return images[1].imageUrl;
    }
    if (images && images.length > 0 && images[0].imageUrl !== this.imageUrl()) {
      return images[0].imageUrl;
    }
    return null;
  });
  currentSize: string | undefined;
  quantity: number = 1;
  loading  = signal<boolean>(false);

  productUrl = computed(() => {
    const p = this.product();
    if (!p?.id) return null;
    return this.slugify.productUrl(this.activeLang(), p.id, p.name ?? '');
  });

  toggleFavorite(event: Event) {
    event.stopPropagation();
    const id = this.product()?.id;
    if (id) this.favoritesService.toggle(id);
  }

  isFavorite = computed(() => {
    const id = this.product()?.id;
    return id ? this.favoritesService.isFavorite(id) : false;
  });

  isOutOfStock = computed(() => {
    const p = this.product();
    if (!p) return false;
    if (p.variants?.length) {
      return !p.variants.some(v => v.available && v.unitsInStock && v.unitsInStock > 0);
    }
    return (p.unitsInStock ?? 0) <= 0;
  });

  addProductInCart() {
    let cartItem: CartItem;
    if (this.product()!.productSizes && this.product()!.productSizes!.length > 0) {
      if (!this.currentSize || this.currentSize === '') {
        return;
      }
      const size: Size = {
        sizeType: this.currentSize,
        available: true
      };
      cartItem = new CartItem(this.product()!, this.quantity, size);
    } else {
      cartItem = new CartItem(this.product()!, this.quantity);
    }
    this.cartService.addToCart(cartItem);
  }
}
