import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CurrencyPipe, NgForOf, NgIf} from '@angular/common';
import {Review} from '../../../@core/services/reviews';

@Component({
  selector: 'app-promotion-card',
  imports: [],
  templateUrl: './promotion-card.html',
  styleUrl: './promotion-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromotionCard {
  promotion = {
    title: 'Набор ухода за кожей лица',
    description: 'Комплексный набор для увлажнения и питания кожи. Подходит для всех типов кожи. Ограниченное предложение!',
    imageUrl: 'https://dummyimage.com/600x400/000/fff',
    price: 799,
    oldPrice: 1199,
    discount: 33,
    endDate: '30 сентября 2025'
  };

  reviews: Review[] = [
    { id: 1, author: 'Мария', rating: 5, comment: 'Отличный набор! Кожа стала мягкой.', date: new Date('2025-09-01') },
    { id: 2, author: 'Елена', rating: 4, comment: 'Хорошо увлажняет, но цена могла быть ниже.', date: new Date('2025-09-02') },
    { id: 3, author: 'Александр', rating: 5, comment: 'Очень доволен покупкой!', date: new Date('2025-09-03') }
  ];

}
