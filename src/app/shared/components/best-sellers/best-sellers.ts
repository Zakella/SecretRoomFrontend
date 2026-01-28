import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {Product} from '../../../entities/product';

@Component({
  selector: 'best-sellers',
  imports: [],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestSellers {
  public bestSellers = input<Product[]>([]);
}
