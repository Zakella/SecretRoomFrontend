import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Product} from '../../../../entities/product';
import {RouterLink} from '@angular/router';
import {Language} from '../../../../@core/services/language';

@Component({
  selector: 'best-sellers',
  imports: [
    RouterLink
  ],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestSellers {
  public bestSellers = input<Product[]>([]);
  private languageService = inject(Language);
  currentLanguage = this.languageService.currentLanguage;


}
