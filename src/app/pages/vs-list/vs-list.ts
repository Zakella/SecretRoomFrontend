import { Component } from '@angular/core';
import {ProductList} from '../../shared/components/product-list/product-list';
import {Filter, FilterGroup} from '../../shared/components/filter/filter';
import {Paginator} from '../../shared/components/paginator/paginator';

@Component({
  selector: 'app-vs-list',
  imports: [
    ProductList,
    Filter,
    Paginator
  ],
  templateUrl: './vs-list.html',
  styleUrl: './vs-list.scss'
})
export class VsList {
  filters: any = [
    {
      key: 'category',
      title: 'Product Category',
      type: 'checkbox',
      values: [
        { label: 'Body', value: 'body', count: 16 },
        { label: 'Skincare', value: 'skincare', count: 21 },
        { label: 'Wellness', value: 'wellness', count: 2 }
      ]
    },
    {
      key: 'type',
      title: 'Product Type',
      type: 'checkbox',
      values: [
        { label: 'Aromatherapy', value: 'aroma', count: 2 },
        { label: 'Bath', value: 'bath', count: 1 },
        { label: 'Moisturizer', value: 'moisturizer', count: 12 }
      ]
    },
    {
      key: 'brand',
      title: 'Brand',
      type: 'search',
      values: [
        { label: 'Sol de Janeiro', value: 'sol' },
        { label: 'Bath & Body Works', value: 'bbw' }
      ]
    }
  ];
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
  ];
  selectedFilters: SelectedFilters = {
    category: [],
    type: [],
    brand: null
  };


  onFilterChange(event:any  ){
    console.log(event);
  }
}
type SelectedFilters = {
  category: string[]; // Product Category (checkbox)
  type: string[];     // Product Type (checkbox)
  brand: string | null; // Brand (search/one)
};

type Chip = {
  key: 'category' | 'type' | 'brand';
  value: string;           // value из фильтра, например 'body'
  label: string;           // то, что показываем на чипе, например 'Category: Body'
};
