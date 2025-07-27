import { Component } from '@angular/core';
import {ProductList} from '../../shared/components/product-list/product-list';
import {Filter} from '../../shared/components/filter/filter';

@Component({
  selector: 'app-vs-list',
  imports: [
    ProductList,
    Filter
  ],
  templateUrl: './vs-list.html',
  styleUrl: './vs-list.scss'
})
export class VsList {
  mockProducts = [
    {
      id: 1,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Питательный крем',
      price: 129.99,
      rating: 3,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: false
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 2,
      isFavorite: false
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: false
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: false
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: false
    },    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },

    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },
    {
      id: 2,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Сыворотка с витамином C',
      price: 89.50,
      rating: 5,
      isFavorite: true
    },


    {
      id: 3,
      image: 'https://images.pexels.com/photos/4612159/pexels-photo-4612159.jpeg',
      title: 'Очищающая маска для лица',
      price: 74.00,
      rating: 3,
      isFavorite: true
    }
  ];
  filters = [
    {
      title: 'Product Category',
      type: 'checkbox',
      values: [
        { label: 'Body', value: 'body', count: 16 },
        { label: 'Skincare', value: 'skincare', count: 21 },
        { label: 'Wellness', value: 'wellness', count: 2 }
      ]
    },
    {
      title: 'Product Type',
      type: 'checkbox',
      values: [
        { label: 'Aromatherapy', value: 'aroma', count: 2 },
        { label: 'Bath', value: 'bath', count: 1 },
        { label: 'Moisturizer', value: 'moisturizer', count: 12 }
      ]
    },
    {
      title: 'Brand',
      type: 'search',
      values: [
        { label: 'Sol de Janeiro', value: 'sol' },
        { label: 'Bath & Body Works', value: 'bbw' }
      ]
    }
  ];


  onFilterChange(event:any  ){
    console.log(event);
  }
}
