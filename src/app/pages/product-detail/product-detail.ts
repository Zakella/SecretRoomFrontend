import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {NgStyle} from '@angular/common';
import {Reviews} from './reviews/reviews';
import {FadeUp} from '../../@core/directives/fade-up';
import {ProductService} from '../../@core/api/product';
import {ActivatedRoute, Router} from '@angular/router';
import {Product} from '../../entities/product';
import {Language} from '../../@core/services/language';
import {ShareLinkService} from '../../@core/services/share-link-service';

@Component({
  selector: 'app-product-detail',
  imports: [NgStyle, Reviews, FadeUp],
  templateUrl: './product-detail.html',
  styleUrl: './product-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductDetail implements OnInit{
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private langService = inject(Language);
  private sharedService = inject(ShareLinkService);

  selectedTab: string = 'description';
  selectedColor: string = 'rose';
  tabs = [
    {key: 'description', label: 'Описание'},
    {key: 'ingredients', label: 'Состав'},
    {key: 'reviews', label: 'Отзывы (12)'}
  ];
  colors = [
    {name: 'rose', label: 'Розовый', hex: '#e86ea8'},
    {name: 'amber', label: 'Янтарный', hex: '#f9c86a'},
    {name: 'mint', label: 'Мятный', hex: '#6ad1b8'}
  ];
  id!: string;
  protected activeLang = this.langService.currentLanguage
  protected product = signal<Product| null>(null);

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.getProductById(this.id);
  }

  private getProductById(id: string) {
    this.productService.getProductById(id).subscribe(res => {
      this.product.set(res);
      console.log(res);
    })
  }

  protected addToCart():void {}

  navigateToList(){
  this.router.navigate([this.activeLang(),'vs']);
  }

  shareProduct(){
    this.sharedService.shareToTelegram()
  }
}
