import {ChangeDetectionStrategy, Component, inject, input, OnInit} from '@angular/core';

import {Product} from '../../../../entities/product';
import {ProductCard} from '../product-card/product-card';
import {BrandService} from '../../../../@core/api/brand';

@Component({
  selector: 'product-list',
  imports: [ProductCard],
  templateUrl: './product-list.html',
  styleUrl: './product-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductList implements OnInit {
  private brandService = inject(BrandService);

  products = input<Product[]>([]);

  ngOnInit(): void {
    // Карточкам нужен справочник брендов, чтобы построить ссылку на брендовую страницу
    // по brandAlias. Запрос кэшируется и склеивается через shareReplay — лишнего трафика нет.
    this.brandService.gerAllBrands().subscribe();
  }
}
