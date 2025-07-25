import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-product-card',
  imports: [],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss'
})
export class ProductCard {
  @Input() imageUrl!: string;
  @Input() title!: string;
  @Input() brand!: string;
  @Input() price!: number | string;
  @Input() rating: number = 5;
  @Input() isBestSeller: boolean = false;
  @Input() showOptions: boolean = false;
}
