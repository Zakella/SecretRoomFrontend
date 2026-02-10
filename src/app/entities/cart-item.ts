import {Product} from "./product";
import {Size} from './size';

export class CartItem {
  id?: string;
  quantity: number;
  amount: number;
  product:Product;
  size?: Size;
  variantAppId?: number;

  constructor(product: Product, quantity:number, size?:Size, variantAppId?: number) {
    this.product = product;
    this.size = size;
    this.variantAppId = variantAppId;
    this.quantity = quantity;
    this.amount = this.quantity * (this.product.price || 0);
  }
}
