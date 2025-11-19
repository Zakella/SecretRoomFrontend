import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {NgStyle} from '@angular/common';
import {Reviews} from './reviews/reviews';
import {FadeUp} from '../../@core/directives/fade-up';
import {ActivatedRoute, Router} from '@angular/router';
import {Product} from '../../entities/product';
import {Language} from '../../@core/services/language';
import {ShareModal} from '../../shared/components/modals/share-modal/share-modal';
import {RecommendedProducts} from '../../shared/components/product/recommended-products/recommended-products';
import {CartUi} from '../../shared/components/cart/services/cart';
import {CartItem} from '../../entities/cart-item';
import {Size} from '../../entities/size';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-product-detail',
  imports: [NgStyle, Reviews, FadeUp, ShareModal, RecommendedProducts, TranslocoPipe],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private langService = inject(Language);
  private cartService = inject(CartUi)
  protected selectedTab: string = 'description';
  protected selectedColor: string = 'rose';
  protected tabs = [
    {key: 'description', label: 'Описание'},
    {key: 'ingredients', label: 'Состав'},
    {key: 'reviews', label: 'Отзывы (12)'}
  ];
  protected colors = [
    {name: 'rose', label: 'Розовый', hex: '#e86ea8'},
    {name: 'amber', label: 'Янтарный', hex: '#f9c86a'},
    {name: 'mint', label: 'Мятный', hex: '#6ad1b8'}
  ];
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product | null>(null);
  quantity: number = 1;
  currentSize: string | undefined;

  constructor() {
    const resolvedProduct = this.route.snapshot.data['product'] as Product | null;
    this.product.set(resolvedProduct);
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
    /*    this.analyticsService.sendEvent('add_to_cart', {
          product_name: this.product.name
        });*/
  }

  protected addToWishlist(): void {
  }

  protected navigateToList() {
    return this.router.navigate([this.activeLang(), 'vs']);
  }
}


