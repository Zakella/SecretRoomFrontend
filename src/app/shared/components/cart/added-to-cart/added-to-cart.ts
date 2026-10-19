import {ChangeDetectionStrategy, Component, HostListener, inject} from '@angular/core';
import {Router} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {AddedToCart} from '../services/added-to-cart';
import {Language} from '../../../../@core/services/language';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';

/** Compact "added to cart" confirmation. Mounted once in the main layout. */
@Component({
  selector: 'app-added-to-cart',
  imports: [TranslocoPipe, LocalizedNamePipe],
  templateUrl: './added-to-cart.html',
  styleUrl: './added-to-cart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AddedToCartToast {
  protected readonly state = inject(AddedToCart);
  private readonly router = inject(Router);
  private readonly lang = inject(Language).currentLanguage;

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.state.item()) {
      this.state.hide();
    }
  }

  protected close(): void {
    this.state.hide();
  }

  protected checkout(): void {
    this.state.hide();
    this.router.navigate(['/', this.lang(), 'checkout']);
  }
}
