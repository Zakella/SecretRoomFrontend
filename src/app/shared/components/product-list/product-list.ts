import {Component, input} from '@angular/core';
import {ProductCard} from '../product-card/product-card';
import {Product} from '../../../entities/product';

/*interface Product {
  id: number,
  image: string,
  title: string,
  price: number,
  rating: number,
  isFavorite: boolean
}*/

@Component({
  selector: 'app-product-list',
  imports: [ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss'
})
export class ProductList {
  products = input<Product[]>([]);

}
