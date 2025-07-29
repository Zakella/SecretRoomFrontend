import { Component } from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-wishlist',
  imports: [
    NgIf,
    NgForOf
  ],
  templateUrl: './wishlist.html',
  styleUrl: './wishlist.scss'
})
export class Wishlist {
  wishlist = [
    {
      id: 1,
      title: 'Glow Nectar Face Oil',
      price: 39,
      image: 'https://images.unsplash.com/photo-1600185365522-5b7b6a9ff09c'
    },
    {
      id: 2,
      title: 'Rose Lip Balm',
      price: 20,
      image: 'https://images.unsplash.com/photo-1589987634394-791f4ab6f0a4'
    }
  ];

  removeItem(id: number) {
    this.wishlist = this.wishlist.filter(item => item.id !== id);
  }

  addToCart(product: any) {
    console.log('Добавлено в корзину:', product);
    // Можно реализовать добавление в корзину
  }
}
