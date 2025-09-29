import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {ProductList} from '../../shared/components/product-list/product-list';
import {Filter} from '../../shared/components/filter/filter';
import {Paginator} from '../../shared/components/paginator/paginator';
import {ProductService} from '../../@core/api/product';
import {Product} from '../../entities/product';
import {StoriesComponent} from '../../shared/components/stories/stories.component';

@Component({
  selector: 'app-vs-list',
  imports: [
    ProductList,
    Filter,
    Paginator,
    StoriesComponent
  ],
  templateUrl: './vs-list.html',
  styleUrl: './vs-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class VsList implements OnInit {
  private productService = inject(ProductService);
  products = signal<Product[]>([])

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe(products => {
      this.products.set(products);
    })
  }

  filters: any = [
    {
      key: 'category',
      title: 'Product Category',
      type: 'checkbox',
      values: [
        {label: 'Body', value: 'body', count: 16},
        {label: 'Skincare', value: 'skincare', count: 21},
        {label: 'Wellness', value: 'wellness', count: 2}
      ]
    },
    {
      key: 'type',
      title: 'Product Type',
      type: 'checkbox',
      values: [
        {label: 'Aromatherapy', value: 'aroma', count: 2},
        {label: 'Bath', value: 'bath', count: 1},
        {label: 'Moisturizer', value: 'moisturizer', count: 12}
      ]
    },
    {
      key: 'brand',
      title: 'Brand',
      type: 'search',
      values: [
        {label: 'Sol de Janeiro', value: 'sol'},
        {label: 'Bath & Body Works', value: 'bbw'}
      ]
    }
  ];


  onFilterChange(event: any) {
    console.log(event);
  }
}
