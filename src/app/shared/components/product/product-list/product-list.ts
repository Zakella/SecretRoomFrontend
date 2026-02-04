import {Component, input} from '@angular/core';

import {Product} from '../../../../entities/product';
import {ProductCard} from '../product-card/product-card';


@Component({
  selector: 'product-list',
  imports: [ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss'
})
export class ProductList {
  products = input<Product[]>([]);
}
