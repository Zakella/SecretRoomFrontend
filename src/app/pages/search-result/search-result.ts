import {Component} from '@angular/core';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {OrderListModule} from 'primeng/orderlist';
import {PickListModule} from 'primeng/picklist';
import {SelectButtonModule} from 'primeng/selectbutton';
import {FormsModule} from '@angular/forms';
import {DataViewModule} from 'primeng/dataview';
import {CommonModule} from '@angular/common';
import {ProductService} from '../../@core/api/product';
import {ProductList} from '../../shared/components/product/product-list/product-list';
import {Product} from '../../entities/product';

@Component({
  selector: 'app-search-result',
  imports: [
    CommonModule,
    DataViewModule,
    FormsModule,
    SelectButtonModule,
    PickListModule,
    OrderListModule,
    TagModule,
    ButtonModule,
    ProductList
  ],
  providers: [ProductService],
  templateUrl: './search-result.html',
  styleUrl: './search-result.scss'
})
export class SearchResult{
  viewMode: 'grid' | 'list' = 'grid';

  products :Product[] = [
    {
      id: '1',
      sku: 'SER-VIT-C-01',
      article: '778899',
      name: 'Glow Reveal Serum',
      nameRu: 'Сыворотка для сияния с витамином С',
      nameRo: 'Ser de strălucire cu Vitamina C',
      description: 'High-concentration vitamin C serum for instant glow.',
      shortDescriptionRu: 'Концентрированная сыворотка для мгновенного сияния кожи.',
      price: 3400,
      oldPrice: 4500,
      discountPercent: 25,
      imageURL: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=800',
      active: true,
      unitsInStock: 15,
      size: '30ml',
      brand: 'Aura Skin Lab',
      brandAlias: 'aura-skin',
      isNew: true,
      isBestSeller: true
    },
    {
      id: '2',
      sku: 'LIP-BALM-ROSE',
      article: '112233',
      name: 'Velvet Rose Lip Balm',
      nameRu: 'Бальзам для губ "Бархатная роза"',
      nameRo: 'Balsam de buze Velvet Rose',
      description: 'Deeply hydrating rose-infused lip treatment.',
      shortDescriptionRu: 'Глубоко увлажняющий бальзам с экстрактом дамасской розы.',
      price: 1200,
      oldPrice: 1200,
      discountPercent: 0,
      imageURL: 'https://images.unsplash.com/photo-1556227702-d1e4e7b5c232?w=800',
      active: true,
      unitsInStock: 50,
      size: '15g',
      brand: 'Silk & Rose',
      brandAlias: 'silk-rose',
      isNew: false,
      isBestSeller: true
    },
    {
      id: '3',
      sku: 'MSK-DETOX-05',
      article: '445566',
      name: 'Midnight Detox Mask',
      nameRu: 'Ночная детокс-маска',
      nameRo: 'Mască Detox de Noapte',
      description: 'Purifying clay mask with activated charcoal and sea minerals.',
      shortDescriptionRu: 'Очищающая маска с углем и морскими минералами.',
      price: 2800,
      oldPrice: 3800,
      discountPercent: 26,
      imageURL: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800',
      active: true,
      unitsInStock: 5,
      size: '100ml',
      brand: 'Pure Essence',
      brandAlias: 'pure-essence',
      isNew: false,
      isBestSeller: false
    },
    {
      id: '4',
      sku: 'OIL-FACE-GLOW',
      article: '990011',
      name: 'Botanical Face Oil',
      nameRu: 'Ботаническое масло для лица',
      nameRo: 'Ulei Facial Botanic',
      description: 'A blend of 12 organic oils for maximum nourishment.',
      shortDescriptionRu: 'Смесь из 12 органических масел для максимального питания.',
      price: 5600,
      oldPrice: 5600,
      discountPercent: 0,
      imageURL: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=800',
      active: true,
      unitsInStock: 0, // Out of stock для теста
      size: '50ml',
      brand: 'Aura Skin Lab',
      brandAlias: 'aura-skin',
      isNew: true,
      isBestSeller: false
    }
  ];
  setViewMode(mode: 'grid' | 'list') {
    this.viewMode = mode;
  }

}
