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
}


export interface ShippingAddress {
  street?: string,
  city?: string,
  country?: string,
  zipCode?: string,
  phoneNumber?: string,
  email?: string

}
