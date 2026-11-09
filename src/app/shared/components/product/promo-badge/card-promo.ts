import {Product} from '../../../../entities/product';
import {PromoLabel, promoLabel} from '../../../pipes/promo-label.pipe';

/** What a catalog-like card shows for a promotion: the badge label and the "online only" note. */
export interface CardPromo {
  label: PromoLabel;
  onlineOnly: boolean;
}

/** Same rule as ProductCard.isOutOfStock: no orderable variant, or no stock for a product without variants. */
function isOutOfStock(product: Product): boolean {
  if (product.variants?.length) {
    return !product.variants.some(v => v.available && v.unitsInStock && v.unitsInStock > 0);
  }
  return (product.unitsInStock ?? 0) <= 0;
}

/**
 * SR-240: promotion of a product card on the home page, same rules as the catalog card (SR-229):
 * the first of `promotions` (backend order: priority desc); null — nothing to show
 * (no promotion, unknown type, or the product is out of stock).
 */
export function cardPromo(product: Product | null | undefined): CardPromo | null {
  if (!product) return null;
  const promotion = product.promotions?.[0] ?? null;
  const label = promoLabel(promotion);
  if (!label || isOutOfStock(product)) return null;
  return {label, onlineOnly: !!promotion?.onlineOnly};
}
