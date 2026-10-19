import {ChangeDetectionStrategy, Component, computed, effect, inject, signal, DestroyRef, RESPONSE_INIT} from '@angular/core';
import {Location} from '@angular/common';
import {Meta} from '@angular/platform-browser';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {map} from 'rxjs';
import {TranslocoPipe} from '@ngneat/transloco';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ShareModal} from '../../../shared/components/modals/share-modal/share-modal';
import {RecommendedProducts} from '../../../shared/components/product/recommended-products/recommended-products';
import {Language} from '../../../@core/services/language';
import {CartUi} from '../../../shared/components/cart/services/cart';
import {ProductImage} from '../../../entities/product-image';
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
import {ProductGallery} from '../../../shared/components/product/product-gallery/product-gallery';
import {ProductPrice} from '../../../shared/components/product/product-price/product-price';
import {MIN_SWATCHES, ProductSwatches} from '../../../shared/components/product/product-swatches/product-swatches';
import {findVariantBySize, hasSizeChoice, pickInitialVariant, sizedVariants, sizeLabel} from './variant-selection';
import {compareSizes} from '../../../shared/utils/size-order';

@Component({
  selector: 'app-product-detail',
  imports: [FadeUp, ShareModal, RecommendedProducts, RecentlyViewed, TranslocoPipe, LocalizedNamePipe, CapitalizePipe, ProductPrice, RouterLink, ProductSwatches, ProductGallery],
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
  private meta = inject(Meta);
  private responseInit = inject(RESPONSE_INIT, {optional: true});
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product | null>(null);
  protected productNotFound = signal(false);
  protected selectedVariant = signal<ProductVariant | null>(null);
  protected effectiveStock = computed(() => {
    const variant = this.selectedVariant();
    if (variant?.unitsInStock !== undefined) {
      return variant.unitsInStock;
    }
    return this.product()?.unitsInStock;
  });
  /** Спокойная пометка «осталось N шт.» для размера/товара: только при остатке 1–3 и если товар не снят и не закончился. */
  protected stockNote = computed(() => {
    const left = this.effectiveStock();
    if (this.isDiscontinued() || this.isOutOfStock() || left === undefined || left < 1 || left > 3) {
      return null;
    }
    return left;
  });
  /** Варианты с непустой подписью размера (SR-168); блок «Размер» показываем при >= 2. */
  protected sizedVariants = computed(() => sizedVariants(this.product()?.variants));
  protected showSizeBlock = computed(() => hasSizeChoice(this.product()?.variants));
  protected hasSwatches = computed(() => (this.product()?.siblings?.length ?? 0) >= MIN_SWATCHES);
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
  /** Фото галереи: основное фото (imageURL) первым, как было главным до галереи, дальше остальные без повторов. */
  galleryImages = computed<ProductImage[]>(() => {
    const p = this.product();
    if (!p) return [];
    const all = [...(p.imageURL ? [{imageUrl: p.imageURL, description: ''}] : []), ...(p.productImagesWebStore ?? [])];
    const seen = new Set<string>();
    const unique = all.filter(image => {
      const key = (image.imageUrl ?? '').split('?')[0];
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    // без единого фото галерея покажет заглушку no-image.png
    return unique.length ? unique : [{imageUrl: '', description: ''}];
  });
  quantity: number = 1;
  currentSize: string | undefined;

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
    this.selectedVariant.set(null);
    if (!product) {
      this.productNotFound.set(true);
      this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
      // 301 на мастера уже выставлен резолвером (погашенная карточка модели): не затираем его 404
      if (this.responseInit && this.responseInit.status !== 301) {
        this.responseInit.status = 404;
        this.responseInit.statusText = 'Not Found';
      }
      return;
    }
    this.productNotFound.set(false);
    if (product) {
      if (product.variants?.length) {
        product.variants.sort((a, b) => compareSizes(a.size, b.size));
      }
      this.trackViewItem(product);
      this.recentlyViewedService.addProduct(product);
      if (product.variants && product.variants.length > 0) {
        const variantParam = this.route.snapshot.queryParamMap.get('variant');
        const preselected = variantParam
          ? product.variants.find(v => String(v.appId) === variantParam)
          : null;
        // ?size= приходит со свотча соседней карточки модели: берём тот же размер, если он в наличии
        const sameSize = preselected ? undefined : findVariantBySize(product.variants, this.route.snapshot.queryParamMap.get('size'));
        const firstAvailable = preselected || sameSize || pickInitialVariant(product.variants, product.appId ?? product.id)!; // API отдаёт id карточки, appId у товара пуст
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

  addProductInCart() {
    let cartItem: CartItem;
    const product = this.product()!;
    const variant = this.selectedVariant();

    if (variant) {
      // вариант без подписи размера (блок «Размер» скрыт) кладём в корзину как товар без размеров, но с appId
      const label = sizeLabel(variant);
      const size: Size | undefined = label ? { sizeType: variant.size, available: true } : undefined;
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
