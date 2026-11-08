/** SR-229: promotion types computed by WebStoreBackend (contract docs/contracts/sr-229-promo-site.md §2). */
export type PromotionType = 'PERCENT' | 'NTH_PERCENT' | 'BUY_X_GET_Y';

/** Active promotion of a product or a cart line; the shown label comes from i18n by type, not the admin name. */
export interface PromotionBadge {
  id: number;
  type: PromotionType | string;
  percent?: number | null;
  nth?: number | null;
  buy?: number | null;
  free?: number | null;
  onlineOnly?: boolean;
}

/** One line of POST /api/v1/cart/calculate; productId is the card appId (as orderItems[].product.id). */
export interface CartCalculationItem {
  productId: number;
  variantAppId: number | null;
  quantity: number;
}

export interface CartCalculationRequest {
  items: CartCalculationItem[];
}

export interface CartCalculationLine {
  productId: number;
  variantAppId?: number | null;
  quantity: number;
  unitPrice: number;
  /** Unit price after the product discount (what the cart showed before promotions). */
  price: number;
  /** To pay for the line. */
  lineTotal: number;
  /** price × quantity − lineTotal; 0 when no promotion won. */
  promotionSavings: number;
  promotion: PromotionBadge | null;
  available: boolean;
}

/** Response of POST /api/v1/cart/calculate; lines are in request order, delivery is not included. */
export interface CartCalculation {
  lines: CartCalculationLine[];
  itemsTotal: number;
  promotionSavings: number;
  total: number;
}
