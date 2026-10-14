import {inject, Injectable, signal} from '@angular/core';
import {Router} from '@angular/router';
import {ProductService} from '../../../../@core/api/product';
import {Language} from '../../../../@core/services/language';
import {Slugify} from '../../../../@core/services/slugify';
import {CartItem} from '../../../../entities/cart-item';
import {Product} from '../../../../entities/product';
import {Size} from '../../../../entities/size';
import {CartUi} from './cart';
import {QuickAddOption, resolveQuickAdd} from './quick-add-resolver';

/** Size-picker panel state: the full product and the sizes to choose from. */
export interface QuickAddPending {
  product: Product;
  options: QuickAddOption[];
}

/**
 * Quick "add to cart" for product lists. Always loads the full card (list payloads
 * miss variants), then adds right away or asks for a size in the picker panel.
 */
@Injectable({providedIn: 'root'})
export class QuickAddToCart {
  private readonly products = inject(ProductService);
  private readonly cartUi = inject(CartUi);
  private readonly router = inject(Router);
  private readonly slugify = inject(Slugify);
  private readonly lang = inject(Language).currentLanguage;
  private readonly _pending = signal<QuickAddPending | null>(null);
  private readonly _loadingId = signal<string | null>(null);

  /** Product waiting for a size choice, null when the panel is closed. */
  readonly pending = this._pending.asReadonly();
  /** Id of the product whose card is being loaded, for button states. */
  readonly loadingId = this._loadingId.asReadonly();

  add(product: Product): void {
    const id = product.id ?? product.appId;
    if (!id || this._loadingId() === id) return;
    this._loadingId.set(id);
    this.products.getProductById(id).subscribe({
      next: full => {
        this._loadingId.set(null);
        this.handle(full);
      },
      error: () => {
        this._loadingId.set(null);
        // Never add a sized product blindly: let the shopper pick on the product page.
        this.router.navigate(this.slugify.productUrl(this.lang(), id, product.name ?? ''));
      },
    });
  }

  choose(option: QuickAddOption): void {
    const pending = this._pending();
    if (!pending || !option.available) return;
    this._pending.set(null);
    this.cartUi.addToCart(new CartItem(pending.product, 1, this.toSize(option.size), option.variantAppId));
  }

  close(): void {
    this._pending.set(null);
  }

  private handle(full: Product): void {
    const result = resolveQuickAdd(full);
    if (result.kind === 'choose') {
      this._pending.set({product: full, options: result.options});
    } else if (result.kind === 'add') {
      this.cartUi.addToCart(new CartItem(full, 1, this.toSize(result.size), result.variantAppId));
    }
  }

  private toSize(size?: string): Size | undefined {
    return size ? {sizeType: size, available: true} : undefined;
  }
}
