import { Component } from '@angular/core';
import {ProductCard} from '../product-card/product-card';
import {BtnShowMore} from '../btn-show-more/btn-show-more';

@Component({
  selector: 'app-best-sellers',
  imports: [
    ProductCard,
    BtnShowMore
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
      imageUrl: 'https://images.pexels.com/photos/2834934/pexels-photo-2834934.jpeg',
      isNew: true
    },
    {
      title: 'Repair Mask',
      brand: 'ILIA',
      price: 667,
      category: 'MAKEUP',
      imageUrl: 'https://images.pexels.com/photos/2834934/pexels-photo-2834934.jpeg',
      isNew: true
    },
    {
      title: 'N.01 Brush - Orange Seventies',
      brand: 'La Bonne Brosse',
      price: 3111,
      category: 'HAIR',
      imageUrl: 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg',
      isNew: true
    },
    {
      title: 'Glow Skin Highlighter Stick',
      brand: 'Goop',
      price: 704,
      category: 'MAKEUP',
      imageUrl: 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg',
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
