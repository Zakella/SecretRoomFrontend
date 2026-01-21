import {Component, inject, effect, OnInit, signal} from '@angular/core';
import {Product} from '../../entities/product';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {OrderListModule} from 'primeng/orderlist';
import {PickListModule} from 'primeng/picklist';
import {SelectButtonModule} from 'primeng/selectbutton';
import {FormsModule} from '@angular/forms';
import {DataViewModule} from 'primeng/dataview';
import {CommonModule} from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {SearchService} from '../../@core/services/search';
import {ProductService} from '../../@core/api/product';

@Component({
  selector: 'app-search-result',
  imports: [CommonModule, DataViewModule, FormsModule, SelectButtonModule, PickListModule, OrderListModule, TagModule, ButtonModule],
  templateUrl: './search-result.html',
  styleUrl: './search-result.scss'
})
export class SearchResult implements OnInit{
  private route = inject(ActivatedRoute);
  private api = inject(ProductService);

  results = signal<any[]>([]);
  loading = signal(false);

  constructor() {
    effect(() => {
      const q = this.route.snapshot.queryParamMap.get('q');
      if (!q) return;

      this.loading.set(true);

/*      this.api.search(q)
        .subscribe(res => {
          this.results.set(res);
          this.loading.set(false);
        });*/
    });
  }

  layout: 'list' | 'grid' = 'list';

  options = ['list', 'grid'];

  products: Product[] = [];




  ngOnInit() {
    this.products = [
      {
        id: '1',
        sku: 'SKU-001',
        article: 'ART-001',
        name: 'Куртка зимняя мужская',
        nameRo: 'Geacă de iarnă pentru bărbați',
        nameRu: 'Мужская зимняя куртка',
        description: 'Тёплая куртка с утеплителем.',
        descriptionRo: 'Geacă caldă cu izolație.',
        descriptionRu: 'Тёплая куртка с утеплителем.',
        shortDescription: 'Зимняя куртка',
        shortDescriptionRo: 'Geacă de iarnă',
        shortDescriptionRu: 'Зимняя куртка',
/*
        productCategory: { id: 1, name: 'Одежда' },
*/
        price: 1999,
        imageURL: 'https://kpcosm.ru/wa-data/public/shop/products/15/25/2515/images/5647/5647.600.png',
        active: true,
        unitsInStock: 15,
        size: 'L',
        brand: 'NorthStorm',
        brandAlias: 'northstorm',
        brandShortName: 'NS',
        productImagesWebStore: [],
        productSizes: [],
        discountPercent: 10,
        oldPrice: 2199
      },
      {
        id: '2',
        sku: 'SKU-002',
        article: 'ART-002',
        name: 'Женские кроссовки',
        nameRo: 'Pantofi sport pentru femei',
        nameRu: 'Женские кроссовки',
        description: 'Лёгкие и удобные кроссовки.',
        descriptionRo: 'Pantofi sport ușori și confortabili.',
        descriptionRu: 'Лёгкие и удобные кроссовки.',
        shortDescription: 'Кроссовки',
        shortDescriptionRo: 'Pantofi sport',
        shortDescriptionRu: 'Кроссовки',
/*
        productCategory: { id: 2, name: 'Обувь' },
*/
        price: 799,
        imageURL: 'https://kpcosm.ru/wa-data/public/shop/products/15/25/2515/images/5647/5647.600.png',
        active: true,
        unitsInStock: 8,
        size: '38',
        brand: 'FlexRun',
        brandAlias: 'flexrun',
        brandShortName: 'FR',
        productImagesWebStore: [],
        productSizes: [],
        discountPercent: 0,
        oldPrice: 799
      },
      {
        id: '3',
        sku: 'SKU-003',
        article: 'ART-003',
        name: 'Мужская футболка',
        nameRo: 'Tricou bărbătesc',
        nameRu: 'Мужская футболка',
        description: 'Хлопковая футболка премиум качества.',
        descriptionRo: 'Tricou premium din bumbac.',
        descriptionRu: 'Хлопковая футболка премиум качества.',
        shortDescription: 'Футболка',
        shortDescriptionRo: 'Tricou',
        shortDescriptionRu: 'Футболка',
/*
        productCategory: { id: 1, name: 'Одежда' },
*/
        price: 249,
        imageURL: 'https://kpcosm.ru/wa-data/public/shop/products/15/25/2515/images/5647/5647.600.png',
        active: true,
        unitsInStock: 50,
        size: 'M',
        brand: 'CottonPro',
        brandAlias: 'cottonpro',
        brandShortName: 'CP',
        productImagesWebStore: [],
        productSizes: [],
        discountPercent: 15,
        oldPrice: 299
      }
    ];
  }

}
