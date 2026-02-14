import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {CartUi} from '../../shared/components/cart/services/cart';
import {Language} from '../../@core/services/language';
import {FavoritesService} from '../../@core/services/favorites';
import {UpperCasePipe} from '@angular/common';

@Component({
  selector: 'mobile-header',
  imports: [
    UpperCasePipe,
    RouterLink
  ],
  templateUrl: './mobile-header.html',
  styleUrl: './mobile-header.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileHeader {
  private cartService = inject(CartUi);
  private langService = inject(Language);
  public favoritesService = inject(FavoritesService);

  cartCount = this.cartService.cartCount;
  activeLang = this.langService.currentLanguage;
  languages = ['ro', 'ru'];

  openCart() {
    this.cartService.open();
  }

  setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }
}
