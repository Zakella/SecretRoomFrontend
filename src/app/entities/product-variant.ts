export interface ProductVariant {
  appId?: number;
  size?: string;
  article?: string;
  price?: number;
  oldPrice?: number;
  discountPercent?: number;
  discountAmount?: number;
  inStock?: boolean;
  unitsInStock?: number;
  available?: boolean;
}
