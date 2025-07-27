import {Address} from "./address";
import {OrderItem} from "./order";
import {Customer} from "./customer";
import {ShippingOption} from './shipping-options';

export interface OrderReview {
  orderNumber: string;
  shippingAddress: Address;
  items: OrderItem[];
  subtotal: number;
  totalAmountOrder: number;
  shippingOption: ShippingOption;
  shippingCost: number;
  customer: Customer;
  comment: string;

}
