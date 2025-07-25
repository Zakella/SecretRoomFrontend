import { Component } from '@angular/core';
import {ProductCard} from '../product-card/product-card';

@Component({
  selector: 'app-best-sellers',
  imports: [
    ProductCard
  ],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss'
})
export class BestSellers {
  categories = ['SKINCARE', 'MAKEUP', 'HAIR', 'BODY', 'WELLNESS', 'NEW'];
  allProducts = [
    {
      title: 'Repair Mask',
      brand: 'Innersense',
      price: 630,
      category: 'HAIR',
      imageUrl: '/assets/products/mask.jpg',
      isNew: true
    },
    {
      title: 'Soft Focus Blurring Blush',
      brand: 'ILIA',
      price: 667,
      category: 'MAKEUP',
      imageUrl: '/assets/products/blush.jpg',
      isNew: true
    },
    {
      title: 'N.01 Brush - Orange Seventies',
      brand: 'La Bonne Brosse',
      price: 3111,
      category: 'HAIR',
      imageUrl: '/assets/products/brush.jpg',
      isNew: true
    },
    {
      title: 'Glow Skin Highlighter Stick',
      brand: 'Goop',
      price: 704,
      category: 'MAKEUP',
      imageUrl: '/assets/products/highlighter.jpg',
      isNew: true
    },
  ];
  selectedCategory = 'NEW';


  get filteredProducts() {
    if (this.selectedCategory === 'NEW') {
      return this.allProducts.filter(p => p.isNew);
    }
    return this.allProducts.filter(p => p.category === this.selectedCategory);
  }

  selectCategory(cat: string) {
    this.selectedCategory = cat;
  }
}
