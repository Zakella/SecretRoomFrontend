import {ChangeDetectionStrategy, Component, inject, input, signal} from '@angular/core';
import {Router} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {CartUi} from '../../cart/services/cart';
import {Product} from '../../../../entities/product';
import {CartItem} from '../../../../entities/cart-item';
import {Size} from '../../../../entities/size';
import {TranslocoPipe} from '@ngneat/transloco';
import {NoImagePipe} from '../../../pipes/no-image-pipe';
import { SkeletonModule } from 'primeng/skeleton';

@Component({
  selector: 'product-card',
  imports: [SkeletonModule, TranslocoPipe, NoImagePipe],
  templateUrl: './product-card.html',
  styleUrl: './product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductCard {
  private route = inject(Router);
  private langService = inject(Language);
  private cartService = inject(CartUi);
  public activeLang = this.langService.currentLanguage
  product = input<Product>();
  readonly imageUrl = input<string>('');
  readonly title = input<string>();
  readonly brand = input<string>();
  readonly price = input<string>();
  readonly rating = input<number>(3);
  readonly isBestSeller = input<boolean>(true);
  readonly showOptions = input<boolean>();
  currentSize: string | undefined;
  quantity: number = 1;
  loading  = signal<boolean>(false);

  protected navToProduct(): void {
     this.route.navigate([this.activeLang(), 'product-detail', this.product()!.id]);
  }

  addProductInCart() {
    let cartItem: CartItem;
    if (this.product()!.productSizes && this.product()!.productSizes!.length > 0) {
      if (!this.currentSize || this.currentSize === '') {
        return;
      }
      const size: Size = {
        sizeType: this.currentSize,
        available: true
      };
      cartItem = new CartItem(this.product()!, this.quantity, size);
    } else {
      cartItem = new CartItem(this.product()!, this.quantity);
    }
    this.cartService.addToCart(cartItem);
  }
}
