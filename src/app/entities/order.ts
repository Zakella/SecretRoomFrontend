import {PromotionBadge} from './promotion';
import {Product} from "./product";
import {Customer} from "./customer";
import {ShippingOption} from './shipping-options';

export interface Order {
  id: number | null;
  orderTrackingNumber?: string;
  status?: OrderStatus;
  placementDate: Date;
  shippingOption?: ShippingOption;
  shippingAddress?: ShippingAddress;
  customer?: Customer;
  shippingCost?: number;
  totalQuantity?: number;
  totalAmount?: number;
  totalAmountOrder?: number;
  items?: OrderItem[];
  comment?: string;
  payment?: string;
  trackingNumber?: string;
}

export type OrderStatus = 'PAYMENT_WAITING' | 'PAYMENT_FAILED' | 'PENDING' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export interface OrderItem {
  product: Product;
  sizeType?: string;
  variantAppId?: number;
  price?: number;
  amount: number;
  quantity: number;
  /** SR-229 (OrderReview): to pay for the line, saved by the promotion over price × quantity, the winning promotion. */
  lineTotal?: number | null;
  promotionSavings?: number | null;
  promotion?: PromotionBadge | null;
}


export interface ShippingAddress {
  street?: string,
  city?: string,
  country?: string,
  zipCode?: string,
  phoneNumber?: string,
  email?: string

}
