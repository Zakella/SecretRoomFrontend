import { Component } from '@angular/core';
import {NgForOf, NgIf, NgStyle} from '@angular/common';

@Component({
  selector: 'app-product-detail',
  imports: [
    NgForOf,
    NgIf,
    NgStyle
  ],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss'
})
export class ProductDetail {
  selectedTab: string = 'description';
  selectedColor: string = 'rose';

  tabs = [
    { key: 'description', label: 'Описание' },
    { key: 'ingredients', label: 'Состав' },
    { key: 'reviews', label: 'Отзывы (12)' }
  ];

  colors = [
    { name: 'rose', label: 'Розовый', hex: '#e86ea8' },
    { name: 'amber', label: 'Янтарный', hex: '#f9c86a' },
    { name: 'mint', label: 'Мятный', hex: '#6ad1b8' }
  ];
}
