import {Component, inject, input} from '@angular/core';
import {Product} from '../../../../entities/product';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'new-arrivals',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './new-arrivals.html',
  styleUrl: './new-arrivals.scss',
})
export class NewArrivals {
  readonly newArrivals = input<Product[]>([]);
  private languageService = inject(Language);
  currentLanguage = this.languageService.currentLanguage;
  currentIndex = 0;

  get translateX(): number {
    return -(this.currentIndex * 360);
  }

  next() {
    // +1 for the "view all" card at the end
    if (this.currentIndex < this.newArrivals().length) this.currentIndex++;
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

  getProductImage(product: Product): string {
    if (product.productImagesWebStore && product.productImagesWebStore.length > 0) {
      return product.productImagesWebStore[0].imageUrl;
    }
    return product.imageURL || '';
  }

  getHoverImage(product: Product): string | null {
    const images = product.productImagesWebStore;
    if (images && images.length > 1) {
      return images[1].imageUrl;
    }
    return null;
  }

  hasDiscount(product: Product): boolean {
    return product.oldPrice > 0 && product.price !== undefined && product.oldPrice > product.price;
  }
}
