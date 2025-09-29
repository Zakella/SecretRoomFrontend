import {Component, input} from '@angular/core';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss'
})
export class ProductCard {
  readonly imageUrl = input<string| null>(null);
  readonly title = input<string>();
  readonly brand = input<string>();
  readonly price = input<number | string>();
  readonly rating = input<number>();
  readonly isBestSeller = input<boolean>();
  readonly showOptions = input<boolean>();
}
