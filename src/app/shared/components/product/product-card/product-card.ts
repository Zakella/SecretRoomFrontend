import {ChangeDetectionStrategy, Component, inject, input} from '@angular/core';
import {Router} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {ShareModal} from '../../modals/share-modal/share-modal';

@Component({
  selector: 'product-card',
  imports: [
    ShareModal
  ],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
  private route = inject(Router);
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage

  readonly imageUrl = input<string>('');
  readonly title = input<string>();
  readonly brand = input<string>();
  readonly price = input<string>();
  readonly rating = input<number>(3);
  readonly isBestSeller = input<boolean>(true);
  readonly showOptions = input<boolean>();

  protected navToProduct(id: string): void {
    this.route.navigate([this.activeLang(), 'product-detail', id]);
  }
}
