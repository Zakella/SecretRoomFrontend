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
import {ProductService} from '../../@core/api/product';

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
    ButtonModule
  ],
  providers: [ProductService],
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

  }

}
