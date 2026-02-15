import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Product} from '../../../../entities/product';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';
import {LocalizedNamePipe} from '../../../../shared/pipes/localized-name.pipe';
import {ProductPrice} from '../../../../shared/components/product/product-price/product-price';

@Component({
  selector: 'best-sellers',
  imports: [
    RouterLink,
    TranslocoPipe,
    LocalizedNamePipe,
    ProductPrice
  ],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestSellers {
  public bestSellers = input<Product[]>([]);
  private languageService = inject(Language);
  currentLanguage = this.languageService.currentLanguage;

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
