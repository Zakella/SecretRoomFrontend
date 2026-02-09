import {Component, inject, input} from '@angular/core';
import {Product} from '../../../../entities/product';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';
import {LocalizedNamePipe} from '../../../../shared/pipes/localized-name.pipe';

@Component({
  selector: 'sales',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalizedNamePipe
  ],
  templateUrl: './sales.html',
  styleUrl: './sales.scss'
})
export class Sales {
  public sales = input<Product[]>([]);
  private languageService = inject(Language);
  currentLanguage = this.languageService.currentLanguage;

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

  getDiscountPercent(product: Product): number {
    if (product.oldPrice && product.price && product.oldPrice > product.price) {
      return Math.round((1 - product.price / product.oldPrice) * 100);
    }
    return 0;
  }
}
