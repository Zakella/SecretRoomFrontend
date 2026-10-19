import {Product} from '../../../../entities/product';
import {compareSizes} from '../../../utils/size-order';

/** A size the shopper can pick in the quick-add panel. */
export interface QuickAddOption {
  size: string;
  variantAppId?: number;
  available: boolean;
}

export type QuickAddResolution =
  | {kind: 'add'; size?: string; variantAppId?: number}
  | {kind: 'choose'; options: QuickAddOption[]}
  | {kind: 'none'};

const ONE_SIZE = new Set(['one', 'one size', 'onesize', 'os', 'o/s', 'u', 'uni', 'unica', 'unic']);

/** A size that actually distinguishes variants: non-blank and not a "one size" marker. */
export function isMeaningfulSize(size?: string | null): size is string {
  const value = size?.trim().toLowerCase();
  return !!value && !ONE_SIZE.has(value);
}

function inStock(v: {available?: boolean; inStock?: boolean; unitsInStock?: number}): boolean {
  return v.available !== false && v.inStock !== false && (v.unitsInStock ?? 0) > 0;
}

/**
 * Card without variants that is explicitly out of stock (SR-181: sold-out model cards are exported too).
 * Missing stock fields are not "sold out": the cart itself refuses `unitsInStock <= 0`, same rule here.
 */
function isSoldOutStandalone(product: Product): boolean {
  return product.inStock === false || (product.unitsInStock != null && product.unitsInStock <= 0);
}

/**
 * Decides what the quick "add to cart" does for a FULL product card
 * (list payloads are not reliable): add right away, ask for a size, or nothing.
 */
export function resolveQuickAdd(product: Product): QuickAddResolution {
  const variants = product.variants ?? [];
  if (variants.length) {
    const bySize = new Map<string, QuickAddOption>();
    for (const v of variants) {
      if (!isMeaningfulSize(v.size)) continue;
      const size = v.size.trim();
      const available = inStock(v);
      const existing = bySize.get(size);
      if (!existing || (available && !existing.available)) {
        bySize.set(size, {size, variantAppId: v.appId, available});
      }
    }
    if (bySize.size > 1) {
      return {kind: 'choose', options: [...bySize.values()].sort((a, b) => compareSizes(a.size, b.size))};
    }
    const first = variants.find(inStock);
    if (!first) return {kind: 'none'};
    return {
      kind: 'add',
      size: isMeaningfulSize(first.size) ? first.size.trim() : undefined,
      variantAppId: first.appId,
    };
  }

  if (isSoldOutStandalone(product)) return {kind: 'none'};

  const legacy = (product.productSizes ?? []).filter(s => !!s.sizeType);
  if (legacy.length > 1) {
    const options = legacy
      .map(s => ({size: s.sizeType!, available: s.available !== false}))
      .sort((a, b) => compareSizes(a.size, b.size));
    return {kind: 'choose', options};
  }
  if (legacy.length === 1) return {kind: 'add', size: legacy[0].sizeType};
  // A standalone card may still carry its own size (e.g. "XS") without any variants.
  return isMeaningfulSize(product.size) ? {kind: 'add', size: product.size.trim()} : {kind: 'add'};
}
