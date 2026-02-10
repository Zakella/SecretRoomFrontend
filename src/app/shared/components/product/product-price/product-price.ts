import {ChangeDetectionStrategy, Component, computed, input} from '@angular/core';

@Component({
  selector: 'product-price',
  templateUrl: './product-price.html',
  styleUrl: './product-price.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.host-sm]': 'size() === "sm"',
    '[class.host-md]': 'size() === "md"',
    '[class.host-lg]': 'size() === "lg"',
  }
})
export class ProductPrice {
  readonly price = input.required<number | undefined>();
  readonly oldPrice = input<number | null | undefined>(null);
  readonly size = input<'sm' | 'md' | 'lg'>('md');

  readonly hasDiscount = computed(() => {
    const old = this.oldPrice();
    const current = this.price();
    return old != null && old > 0 && current != null && old > current;
  });
}
