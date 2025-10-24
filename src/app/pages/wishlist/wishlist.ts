import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';
import {CustomTitle} from '../../shared/components/custom-title/custom-title';

@Component({
  selector: 'app-wishlist',
  imports: [
    FadeUp,
    CustomTitle
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Wishlist {
  wishlist = [
    {
      id: 1,
      title: 'Glow Nectar Face Oil',
      price: 39,
      image: '/assets/images/demo/main.jpeg'
    },
    {
      id: 2,
      title: 'Rose Lip Balm',
      price: 20,
      image: '/assets/images/demo/main.jpeg'
    }
  ];

  removeItem(id: number) {
/*
    this.wishlist = this.wishlist.filter(item => item.id !== id);
*/
  }

  addToCart(product: any) {
    console.log('Добавлено в корзину:', product);
  }
}
