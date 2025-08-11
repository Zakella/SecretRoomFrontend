import {Product} from "./product";
import {Customer} from "./customer";
import {ShippingOption} from './shipping-options';

export interface Order {
     id: number | null,
     placementDate: Date,
     shippingOption?: ShippingOption,
     shippingAddress?: ShippingAddress, // добавьте это свойство
     customer?: Customer,
     shippingCost?: number,
     totalQuantity?: number,
     totalAmount?: number,
     totalAmountOrder?: number,
     items?: OrderItem[],
     comment?: string

}

export interface OrderItem {
  product: Product;
  sizeType?: string;
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
