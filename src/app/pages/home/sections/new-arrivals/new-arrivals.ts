import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Product} from '../../../../entities/product';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';
import {LocalizedNamePipe} from '../../../../shared/pipes/localized-name.pipe';
import {ProductPrice} from '../../../../shared/components/product/product-price/product-price';

@Component({
  selector: 'new-arrivals',
  imports: [RouterLink, TranslocoPipe, LocalizedNamePipe, ProductPrice],
  templateUrl: './new-arrivals.html',
  styleUrl: './new-arrivals.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
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
    return product.imageURL || '';
  }

  getHoverImage(product: Product): string | null {
    const images = product.productImagesWebStore;
    if (images && images.length > 0) {
      const mainUrl = product.imageURL || '';
      const alt = images.find(img => img.imageUrl !== mainUrl);
      return alt?.imageUrl || null;
    }
    return null;
  }

}
