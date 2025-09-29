import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ProductService} from '../../@core/api/product';

@Component({
  selector: 'app-bb-list',
  imports: [],
  templateUrl: './bb-list.html',
  styleUrl: './bb-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BbList implements OnInit{
  private productService = inject(ProductService);

  ngOnInit(): void {
    this.productService.getAllProducts().subscribe(products => {
      console.log(products);
    })
  }

}
