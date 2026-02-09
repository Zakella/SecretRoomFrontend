import {ChangeDetectionStrategy, Component, effect, inject, signal, DestroyRef} from '@angular/core';
import {NgClass, Location} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
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
import {GoogleAnalytics} from '../../../@core/services/google-analytics';
import {RecentlyViewedService} from '../../../@core/services/recently-viewed.service';
import {RecentlyViewed} from '../../../shared/components/product/recently-viewed/recently-viewed';

@Component({
  selector: 'app-product-detail',
  imports: [FadeUp, ShareModal, RecommendedProducts, RecentlyViewed, TranslocoPipe, NgClass, LocalizedNamePipe],
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
  private location = inject(Location);
  private ga = inject(GoogleAnalytics);
  private recentlyViewedService = inject(RecentlyViewedService);
  public favoritesService = inject(FavoritesService);
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product | null>(null);
  quantity: number = 1;
  currentSize: string | undefined;
  mainImage: string | null = null;

  private destroyRef = inject(DestroyRef);

  constructor() {
    // Synchronous initial load (snapshot available immediately)
    const initialProduct = this.route.snapshot.data['product'] as Product | null;
    this.setProduct(initialProduct);

    // Subscribe for subsequent navigations (same route, different params)
    this.route.data.pipe(
      map(data => data['product'] as Product | null),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(resolvedProduct => {
      if (resolvedProduct?.id !== this.product()?.id) {
        this.setProduct(resolvedProduct);
      }
    });

    effect(() => {
      const p = this.product();
      const lang = this.activeLang();
      if (p) {
        this.metaService.setProductMeta(p, lang, this.slugify);
      }
    });
  }

  private setProduct(product: Product | null) {
    this.product.set(product);
    this.quantity = 1;
    this.currentSize = undefined;
    if (product) {
      this.mainImage = product.imageURL;
      this.trackViewItem(product);
      this.recentlyViewedService.addProduct(product);
    }
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
    this.trackAddToCart(product);
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
    this.location.back();
  }

  private trackViewItem(product: Product) {
    this.ga.send({
      event: 'view_item',
      category: 'ecommerce',
      label: product.name,
      value: product.price
    });
  }

  private trackAddToCart(product: Product) {
    this.ga.send({
      event: 'add_to_cart',
      category: 'ecommerce',
      label: product.name,
      value: product.price
    });
  }
}
