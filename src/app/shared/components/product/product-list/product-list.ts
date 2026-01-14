import {Component, input} from '@angular/core';
import {ProductCard} from '../product-card/product-card';
import {Product} from '../../../../entities/product';


@Component({
  selector: 'product-list',
  imports: [ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss'
})
export class ProductList {
  products = input<Product[]>([]);
}
