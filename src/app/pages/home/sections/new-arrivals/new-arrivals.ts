import {Component, input, OnChanges} from '@angular/core';
import {Product} from '../../../../entities/product';

@Component({
  selector: 'new-arrivals',
  imports: [],
  templateUrl: './new-arrivals.html',
  styleUrl: './new-arrivals.scss',
})
export class NewArrivals {
  readonly newArrivals = input<Product[]>([]);
  currentIndex = 0;

  get translateX(): number {
    return -(this.currentIndex * 360);
  }

  next() {
    if (this.currentIndex < this.newArrivals().length - 1) this.currentIndex++;
  }

  prev() {
    if (this.currentIndex > 0) this.currentIndex--;
  }

  goTo(i: number) {
    this.currentIndex = i;
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/no-image.png';
  }
}
