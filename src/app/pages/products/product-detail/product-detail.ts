import {ChangeDetectionStrategy, Component, computed, effect, inject, signal, DestroyRef} from '@angular/core';
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
import {ProductVariant} from '../../../entities/product-variant';
import {ProductService} from '../../../@core/api/product';
import {FavoritesService} from '../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {CapitalizePipe} from '../../../shared/pipes/capitalize.pipe';
import {MetaService} from '../../../@core/services/meta.service';
import {Slugify} from '../../../@core/services/slugify';
import {GoogleAnalytics} from '../../../@core/services/google-analytics';
import {RecentlyViewedService} from '../../../@core/services/recently-viewed.service';
import {RecentlyViewed} from '../../../shared/components/product/recently-viewed/recently-viewed';
import {ProductPrice} from '../../../shared/components/product/product-price/product-price';

@Component({
  selector: 'app-product-detail',
  imports: [FadeUp, ShareModal, RecommendedProducts, RecentlyViewed, TranslocoPipe, NgClass, LocalizedNamePipe, CapitalizePipe, ProductPrice],
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
  protected selectedVariant = signal<ProductVariant | null>(null);
  protected effectiveStock = computed(() => {
    const variant = this.selectedVariant();
    if (variant?.unitsInStock !== undefined) {
      return variant.unitsInStock;
    }
    return this.product()?.unitsInStock;
  });
  protected isDiscontinued = computed(() => {
    return this.product()?.discontinued === true;
  });
  protected isOutOfStock = computed(() => {
    const p = this.product();
    if (!p) return false;
    if (p.discontinued) return true;
    if (p.variants?.length) {
      return !p.variants.some(v => v.available && v.unitsInStock && v.unitsInStock > 0);
    }
    return (p.unitsInStock ?? 0) <= 0;
  });
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

  private static readonly SIZE_ORDER: string[] = [
    'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl', '2xl', '3xl', '4xl', '5xl',
    'one-size',
    '70a', '70b', '70c', '70d', '75a', '75b', '75c', '75d',
    '80a', '80b', '80c', '80d', '85a', '85b', '85c', '85d',
  ];

  private setProduct(product: Product | null) {
    this.product.set(product);
    this.quantity = 1;
    this.currentSize = undefined;
    this.selectedVariant.set(null);
    if (product) {
      if (product.variants?.length) {
        product.variants.sort((a, b) => this.compareSizes(a.size, b.size));
      }
      this.mainImage = product.imageURL;
      this.trackViewItem(product);
      this.recentlyViewedService.addProduct(product);
      if (product.variants && product.variants.length > 0) {
        const firstAvailable = product.variants.find(v => v.available && v.inStock) || product.variants[0];
        this.selectVariant(firstAvailable);
      }
    }
  }

  selectVariant(variant: ProductVariant) {
    this.selectedVariant.set(variant);
    this.currentSize = variant.size;
    this.updateSizeInFilters(variant.size);
  }

  private updateSizeInFilters(size?: string) {
    const product = this.product();
    if (!product?.filters || !size) return;
    const sizeFilter = product.filters.find(f => f.filterSlug === 'size');
    if (sizeFilter) {
      sizeFilter.valueRu = size;
      sizeFilter.valueRo = size;
      sizeFilter.valueSlug = size.toLowerCase().replace(' ', '-');
      this.product.set({...product});
    }
  }

  private compareSizes(a?: string, b?: string): number {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    const idxA = ProductDetail.SIZE_ORDER.indexOf(a.toLowerCase());
    const idxB = ProductDetail.SIZE_ORDER.indexOf(b.toLowerCase());
    if (idxA === -1 && idxB === -1) return a.localeCompare(b, undefined, {numeric: true});
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  }

  addProductInCart() {
    let cartItem: CartItem;
    const product = this.product()!;
    const variant = this.selectedVariant();

    if (variant) {
      const size: Size = { sizeType: variant.size, available: true };
      cartItem = new CartItem(product, this.quantity, size, variant.appId);
    } else if (product.productSizes && product.productSizes.length > 0) {
      const sizeType = this.currentSize || product.productSizes.find(s => s.available)?.sizeType || product.productSizes[0].sizeType;
      const size: Size = { sizeType: sizeType, available: true };
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
