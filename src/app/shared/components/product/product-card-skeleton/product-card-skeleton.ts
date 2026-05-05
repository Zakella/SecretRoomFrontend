import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'product-card-skeleton',
  templateUrl: './product-card-skeleton.html',
  styleUrl: './product-card-skeleton.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductCardSkeleton {
  count = input<number>(12);

  readonly slots = Array.from({length: 24}, (_, i) => i);

  visibleSlots() {
    return this.slots.slice(0, this.count());
  }
}
