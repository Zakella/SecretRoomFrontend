import {afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {QuickAddToCart} from '../../cart/services/quick-add-to-cart';
import {Product} from '../../../../entities/product';
import {TranslocoPipe} from '@ngneat/transloco';
import { SkeletonModule } from 'primeng/skeleton';
import {AnalyticEvent} from '../../../../@core/directives/analytic-event';
import {FavoritesService} from '../../../../@core/services/favorites';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {Slugify} from '../../../../@core/services/slugify';
import {BrandService} from '../../../../@core/api/brand';
import {ProductPrice} from '../product-price/product-price';
import {extraOptionsCount, moreOptionsKey} from './option-count-label';

@Component({
  selector: 'product-card',
  imports: [SkeletonModule, TranslocoPipe, AnalyticEvent, LocalizedNamePipe, ProductPrice, RouterLink],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
  private langService = inject(Language);
  private quickAdd = inject(QuickAddToCart);
  private slugify = inject(Slugify);
  private brandService = inject(BrandService);
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
  /**
   * Loading of the main image: 'lazy' (default) for cards below the fold,
   * 'eager' for cards visible on first paint, 'high' — eager plus fetchpriority=high (the LCP candidate).
   */
  readonly loadingPriority = input<'lazy' | 'eager' | 'high'>('lazy');

  hasDiscount = computed(() => {
    const old = this.oldPrice();
    const current = this.price();
    return old !== null && old > 0 && current !== undefined && old > current;
  });

  /** Фото карточки: главное (imageUrl) первым, затем остальные из товара; без пустых и дублей. */
  images = computed(() => {
    const urls = [
      this.imageUrl(),
      ...(this.product()?.productImagesWebStore?.map(i => i.imageUrl) ?? []),
    ].filter((url): url is string => !!url);
    return Array.from(new Set(urls));
  });

  selectedImageIndex = signal(0);

  /** Окно из не более 5 точек вокруг активного фото: индексы фото; у краёв окно прижимается. */
  visibleDots = computed(() => {
    const total = this.images().length;
    const size = Math.min(5, total);
    const active = Math.min(this.selectedImageIndex(), Math.max(total - 1, 0));
    const start = Math.max(0, Math.min(active - Math.floor(size / 2), total - size));
    return Array.from({length: size}, (_, k) => start + k);
  });
  /** Крайняя точка окна, за которой есть ещё фото, рисуется меньше. */
  isEdgeDot(index: number): boolean {
    const dots = this.visibleDots();
    const total = this.images().length;
    if (dots.length >= total) return false;
    return (index === dots[0] && index > 0) || (index === dots[dots.length - 1] && index < total - 1);
  }

  /** Остальные фото (кроме первого) рендерим, только когда карточка рядом с зоной видимости. */
  imagesVisible = signal(false);
  private scrollFrame: number | null = null;
  private scrollAnimationFrame: number | null = null;
  private preloadedImages = new Set<string>();
  private intersectionObserver: IntersectionObserver | null = null;
  private platformId = inject(PLATFORM_ID);
  private hostRef = inject<ElementRef<HTMLElement>>(ElementRef);

  loading  = signal<boolean>(false);

  productUrl = computed(() => {
    const p = this.product();
    if (!p?.id) return null;
    return this.slugify.productUrl(this.activeLang(), p.id, p.name ?? '');
  });

  /** Ссылка на брендовую страницу товара. null — если бренд не удалось сопоставить. */
  brandUrl = computed(() => {
    const slug = this.brandService.slugForAlias(this.product()?.brandAlias);
    if (!slug) return null;
    return ['/', this.activeLang(), 'catalog', 'brand', slug];
  });

  queryParams = computed(() => {
    const variantId = this.product()?.selectedVariantAppId;
    return variantId ? {variant: variantId} : {};
  });

  /** «+N» других карточек модели; null — плашки нет (optionCount пуст или < 2). */
  extraOptions = computed(() => {
    const count = extraOptionsCount(this.product()?.optionCount);
    if (count === null) return null;
    return {count, key: moreOptionsKey(this.product()?.optionType, count, this.activeLang())};
  });

  constructor() {
    const isBrowser = isPlatformBrowser(this.platformId);

    afterNextRender(() => {
      if (!isBrowser) return;
      if (typeof IntersectionObserver === 'undefined') {
        this.imagesVisible.set(true);
        return;
      }
      this.intersectionObserver = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
          this.imagesVisible.set(true);
          this.intersectionObserver?.disconnect();
          this.intersectionObserver = null;
        }
      }, {rootMargin: '200px 0px'});
      this.intersectionObserver.observe(this.hostRef.nativeElement);
    });

    // Предзагрузка соседних фото (индекс ±1), только в браузере
    effect(() => {
      if (!isBrowser || !this.imagesVisible()) return;
      const images = this.images();
      const index = Math.min(this.selectedImageIndex(), Math.max(images.length - 1, 0));
      this.preloadNearImages(images, index);
    });

    inject(DestroyRef).onDestroy(() => {
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;
      if (isBrowser) {
        if (this.scrollFrame !== null) window.cancelAnimationFrame(this.scrollFrame);
        if (this.scrollAnimationFrame !== null) window.cancelAnimationFrame(this.scrollAnimationFrame);
      }
    });
  }

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

  /** The full card of this product is being loaded for the quick add. */
  readonly isAdding = computed(() => this.quickAdd.isLoading(this.product()));

  addProductInCart() {
    const product = this.product();
    if (product) this.quickAdd.add(product);
  }

  selectImage(index: number, track: HTMLElement, event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.selectedImageIndex.set(index);
    this.scrollToImage(track, index);
  }

  previousImage(track: HTMLElement, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.moveImage(-1, track);
  }

  nextImage(track: HTMLElement, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.moveImage(1, track);
  }

  onImageScroll(track: HTMLElement) {
    if (this.scrollFrame !== null || !isPlatformBrowser(this.platformId)) return;
    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      const width = track.clientWidth;
      if (width <= 0) return;
      const index = Math.round(track.scrollLeft / width);
      if (index !== this.selectedImageIndex()) this.selectedImageIndex.set(index);
    });
  }

  private moveImage(step: number, track: HTMLElement) {
    const length = this.images().length;
    if (length < 2) return;
    this.selectImage((this.selectedImageIndex() + step + length) % length, track);
  }

  private scrollToImage(track: HTMLElement, index: number) {
    if (!isPlatformBrowser(this.platformId)) return;
    const target = index * track.clientWidth;
    const start = track.scrollLeft;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    if (this.scrollAnimationFrame !== null) window.cancelAnimationFrame(this.scrollAnimationFrame);

    const duration = 160;
    const startTime = performance.now();
    const animate = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      track.scrollLeft = start + distance * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) {
        this.scrollAnimationFrame = window.requestAnimationFrame(animate);
        return;
      }
      this.scrollAnimationFrame = null;
      track.scrollLeft = target;
    };
    this.scrollAnimationFrame = window.requestAnimationFrame(animate);
  }

  private preloadNearImages(images: string[], index: number) {
    const length = images.length;
    if (!length) return;
    for (const i of new Set([index, (index + 1) % length, (index - 1 + length) % length])) {
      const url = images[i];
      if (!url || this.preloadedImages.has(url)) continue;
      this.preloadedImages.add(url);
      const img = new Image();
      img.decoding = 'async';
      img.src = url;
    }
  }
}
