import {ChangeDetectionStrategy, Component} from '@angular/core';
import {CurrencyPipe, DatePipe} from '@angular/common';

interface Promotion {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  price: number;
  oldPrice?: number;
  discount?: number;
  endDate?: Date;
}

@Component({
  selector: 'app-list',
  imports: [
    CurrencyPipe,
    DatePipe
  ],
  templateUrl: './list.html',
  styleUrl: './list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class List {
  promotions: Promotion[] = [
    {
      id: 1,
      title: 'Набор ухода за кожей лица',
      description: 'Комплексный набор для увлажнения и питания кожи. Ограниченное предложение!',
      imageUrl: 'https://via.placeholder.com/400x250',
      price: 799,
      oldPrice: 1199,
      discount: 33,
      endDate: new Date('2025-09-30')
    },
    {
      id: 2,
      title: 'Маска для лица с глиной',
      description: 'Очищает поры и придаёт коже свежесть.',
      imageUrl: 'https://via.placeholder.com/400x250',
      price: 299,
      oldPrice: 399,
      discount: 25,
      endDate: new Date('2025-09-25')
    },
    {
      id: 3,
      title: 'Сыворотка для волос',
      description: 'Укрепляет и питает волосы, придаёт блеск.',
      imageUrl: 'https://via.placeholder.com/400x250',
      price: 499,
      oldPrice: 699,
      discount: 28,
      endDate: new Date('2025-10-05')
    }
  ];
}
