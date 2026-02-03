import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {NgClass} from '@angular/common';
import {Reviews} from './reviews/reviews';
import {ActivatedRoute, Router} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {FadeUp} from '../../../@core/directives/fade-up';
import {ShareModal} from '../../../shared/components/modals/share-modal/share-modal';
import {RecommendedProducts} from '../../../shared/components/product/recommended-products/recommended-products';
import {Language} from '../../../@core/services/language';
import {CartUi} from '../../../widgets/cart/services/cart';
import {Product} from '../../../entities/product';
import {CartItem} from '../../../entities/cart-item';
import {Size} from '../../../entities/size';
import {ProductService} from '../../../@core/api/product';

@Component({
  selector: 'app-product-detail',
  imports: [Reviews, FadeUp, ShareModal, RecommendedProducts, TranslocoPipe, NgClass],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  providers: [ProductService],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private langService = inject(Language);
  private cartService = inject(CartUi)
  protected selectedTab: string = 'description';
  protected tabs = [
    {key: 'description', label: 'Описание'},
    {key: 'ingredients', label: 'Состав'},
    {key: 'reviews', label: 'Отзывы (12)'}
  ];
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product | null>(null);
  quantity: number = 1;
  currentSize: string | undefined;
  mainImage: string | null = null;

  constructor() {
    const resolvedProduct = this.route.snapshot.data['product'] as Product | null;
    this.product.set(resolvedProduct);
    this.mainImage = this.product()!.imageURL;
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
    this.cartService.visible();
  }

  protected addToWishlist(): void {
  }

  protected navigateToList() {
    return this.router.navigate([this.activeLang(), 'vs']);
  }
}


