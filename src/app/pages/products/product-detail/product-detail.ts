import {ChangeDetectionStrategy, Component, effect, inject, signal} from '@angular/core';
import {NgClass} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ShareModal} from '../../../shared/components/modals/share-modal/share-modal';
import {RecommendedProducts} from '../../../shared/components/product/recommended-products/recommended-products';
import {Language} from '../../../@core/services/language';
import {CartUi} from '../../../shared/components/cart/services/cart';
import {Product} from '../../../entities/product';
import {CartItem} from '../../../entities/cart-item';
import {Size} from '../../../entities/size';
import {ProductService} from '../../../@core/api/product';
import {FavoritesService} from '../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {MetaService} from '../../../@core/services/meta.service';
import {Slugify} from '../../../@core/services/slugify';

@Component({
  selector: 'app-product-detail',
  imports: [FadeUp, ShareModal, RecommendedProducts, TranslocoPipe, NgClass, LocalizedNamePipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  providers: [ProductService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private langService = inject(Language);
  private cartService = inject(CartUi);
  private metaService = inject(MetaService);
  private slugify = inject(Slugify);
  public favoritesService = inject(FavoritesService);
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product | null>(null);
  quantity: number = 1;
  currentSize: string | undefined;
  mainImage: string | null = null;

  constructor() {
    const resolvedProduct = this.route.snapshot.data['product'] as Product | null;
    this.product.set(resolvedProduct);
    if (resolvedProduct) {
      this.mainImage = resolvedProduct.imageURL;
    }

    effect(() => {
      const p = this.product();
      const lang = this.activeLang();
      if (p) {
        this.metaService.setProductMeta(p, lang, this.slugify);
      }
    });
  }

  hasDiscount(): boolean {
    const p = this.product();
    if (!p) return false;
    return p.oldPrice > 0 && p.price !== undefined && p.oldPrice > p.price;
  }

  addProductInCart() {
    let cartItem: CartItem;
    const product = this.product()!;
    if (product.productSizes && product.productSizes.length > 0) {
      const sizeType = this.currentSize || product.productSizes.find(s => s.available)?.sizeType || product.productSizes[0].sizeType;
      const size: Size = {
        sizeType: sizeType,
        available: true
      };
      cartItem = new CartItem(product, this.quantity, size);
    } else {
      cartItem = new CartItem(product, this.quantity);
    }
    this.cartService.addToCart(cartItem);
  }

  protected toggleWishlist(): void {
    const id = this.product()?.id;
    if (id) this.favoritesService.toggle(id);
  }

  protected isFavorite(): boolean {
    const id = this.product()?.id;
    return id ? this.favoritesService.isFavorite(id) : false;
  }

  protected navigateToList() {
    return this.router.navigate([this.activeLang(), 'vs']);
  }
}
