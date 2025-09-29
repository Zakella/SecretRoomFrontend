import {ChangeDetectionStrategy, Component} from '@angular/core';
import {NgStyle} from '@angular/common';
import {Reviews} from './reviews/reviews';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-product-detail',
  imports: [NgStyle, Reviews, FadeUp],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail {
  selectedTab: string = 'description';
  selectedColor: string = 'rose';

  tabs = [
    {key: 'description', label: 'Описание'},
    {key: 'ingredients', label: 'Состав'},
    {key: 'reviews', label: 'Отзывы (12)'}
  ];

  colors = [
    {name: 'rose', label: 'Розовый', hex: '#e86ea8'},
    {name: 'amber', label: 'Янтарный', hex: '#f9c86a'},
    {name: 'mint', label: 'Мятный', hex: '#6ad1b8'}
  ];
}
