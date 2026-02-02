import {ChangeDetectionStrategy, Component, signal} from '@angular/core';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-wishlist',
  imports: [
    NgForOf
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Wishlist {
  items = signal([
    {
      id: 1,
      title: 'Hydra Silk Serum',
      subtitle: 'Deep hydration & glow',
      price: 129,
      image: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd'
    },
    {
      id: 2,
      title: 'Noir Midnight',
      subtitle: 'Eau de Parfum',
      price: 189,
      image: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519'
    }
  ]);
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
  remove(id: number) {
    //@ts-ignore
    this.items.update(list => list.filter(i => i.id !== id));
  }

  addToCart(product: any) {
    console.log('Добавлено в корзину:', product);
  }

  shareWishlist() {
    const url = window.location.href;
    const text = `My wishlist (${this.items().length} items)`;

    if (navigator.share) {
      navigator.share({
        title: 'Wishlist',
        text,
        url
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).then(() => {
        alert('Wishlist link copied');
      });
    }
  }

}
