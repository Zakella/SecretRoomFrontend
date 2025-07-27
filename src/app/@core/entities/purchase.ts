import {Customer} from './customer';
import {Address} from './address';
import {Order, OrderItem} from './order';

export interface Purchase {

  customer: Customer;
  shippingAddress: Address;
  order: Order;
  orderItems: OrderItem[];
  comment: string;
  language: string;
  payment: string | null;
}
