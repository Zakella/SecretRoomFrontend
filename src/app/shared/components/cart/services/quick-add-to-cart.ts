import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {Size} from '../../../../entities/size';
import {ProductService} from '../../../../@core/api/product';
import {Slugify} from '../../../../@core/services/slugify';
import {Language} from '../../../../@core/services/language';
import {CartUi} from './cart';

const ONE_SIZE = new Set(['one', 'one size', 'onesize', 'os', 'o/s', 'u', 'uni', 'unica', 'unic']);

export type QuickAddResolution =
  | {action: 'choose'}
  | {action: 'none'}
  | {action: 'add'; size?: Size; variantAppId?: number};

/** A size that really needs a choice: non-empty and not a one-size marker. */
export function isMeaningfulSize(size: string | null | undefined): size is string {
  const s = size?.trim();
  return !!s && !ONE_SIZE.has(s.toLowerCase());
}

/** Decides how a fully loaded product can be added to the cart without a size picker. */
export function resolveQuickAdd(full: Product): QuickAddResolution {
  const variants = full.variants ?? [];
  if (variants.length) {
    const sizes = new Set(variants.filter(v => isMeaningfulSize(v.size)).map(v => v.size!.trim().toLowerCase()));
    if (sizes.size > 1) return {action: 'choose'};
    const v = variants.find(x => x.available !== false && x.inStock !== false && (x.unitsInStock ?? 0) > 0);
    if (!v) return {action: 'none'};
    return {
      action: 'add',
      size: isMeaningfulSize(v.size) ? {sizeType: v.size, available: true} : undefined,
      variantAppId: v.appId,
    };
  }
  const sizes = full.productSizes ?? [];
  if (sizes.length > 1) return {action: 'choose'};
  if (sizes.length === 1) return {action: 'add', size: {sizeType: sizes[0].sizeType, available: true}};
  if (isMeaningfulSize(full.size)) return {action: 'add', size: {sizeType: full.size, available: true}};
  return {action: 'add'};
}

export function needsSizeChoice(full: Product): boolean {
  return resolveQuickAdd(full).action === 'choose';
}

/**
 * Quick "add to cart" from product lists. List payloads carry no variants,
 * so the full product is loaded first; sized products go to the product page.
 */
@Injectable({providedIn: 'root'})
export class QuickAddToCart {
  private productService = inject(ProductService);
  private cartUi = inject(CartUi);
  private router = inject(Router);
  private slugify = inject(Slugify);
  private lang = inject(Language);
  private pending = new Set<string>();

  add(product: Product): void {
    const id = product.id ?? product.appId;
    if (!id || this.pending.has(id)) return;
    this.pending.add(id);
    this.productService.getProductById(id).subscribe({
      next: full => {
        this.pending.delete(id);
        const r = resolveQuickAdd(full);
        if (r.action === 'choose') this.goToProduct(product);
        else if (r.action === 'add') this.cartUi.addToCart(new CartItem(full, 1, r.size, r.variantAppId));
      },
      error: () => {
        this.pending.delete(id);
        this.goToProduct(product);
      },
    });
  }

  private goToProduct(product: Product): void {
    const id = product.appId || product.id;
    if (!id) return;
    // Close the cart drawer too: the quick add may come from its recommendations.
    this.router.navigate(this.slugify.productUrl(this.lang.currentLanguage(), id, product.name ?? ''))
      .then(() => this.cartUi.close());
  }
}
