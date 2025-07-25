import {Component, Input} from '@angular/core';
import {ProductCard} from '../product-card/product-card';

interface Product {
  id: number,
  image: string,
  title: string,
  price: number,
  rating: number,
  isFavorite: boolean
}

@Component({
  selector: 'app-product-list',
  imports: [
    ProductCard
  ],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss'
})
export class ProductList {
  @Input() products: Product[] = [];

}
