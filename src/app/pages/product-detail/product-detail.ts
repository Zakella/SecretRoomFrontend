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

@Component({
  selector: 'app-product-detail',
  imports: [NgStyle, Reviews, FadeUp, ShareModal, RecommendedProducts],
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

  constructor() {
    const resolvedProduct = this.route.snapshot.data['product'] as Product | null;
    this.product.set(resolvedProduct);
  }


  protected addToCart(): void {
/*
    this.cartService.addToCart()
*/
  }

  protected addToWishlist(): void {}

  protected navigateToList() {
    this.router.navigate([this.activeLang(), 'vs']);
  }
}


