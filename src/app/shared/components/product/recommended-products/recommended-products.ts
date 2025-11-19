import {ChangeDetectionStrategy, Component, input, OnInit, output} from '@angular/core';
import {CarouselModule} from 'primeng/carousel';
import {ButtonModule} from 'primeng/button';
import {TagModule} from 'primeng/tag';
import {Product} from '../../../../entities/product';

@Component({
  selector: 'recommended-products',
  imports: [CarouselModule, ButtonModule, TagModule],
  templateUrl: './recommended-products.html',
  styleUrl: './recommended-products.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class RecommendedProducts implements OnInit {
  products: Product[] | undefined;
  responsiveOptions: any[] | undefined;
  protected relatedProducts = input<Product[]>([]);
  protected addTopBag = output<Product>();
  protected addToWishlist = output<Product>();


  ngOnInit() {
    this.products = MOCK_PRODUCTS;

    this.responsiveOptions = [
      {
        breakpoint: '1199px',
        numVisible: 3,
        numScroll: 3
      },
      {
        breakpoint: '991px',
        numVisible: 2,
        numScroll: 2
      },
      {
        breakpoint: '767px',
        numVisible: 1,
        numScroll: 1
      }
    ];
  }
}

export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'SHO-001',
    name: 'Nike Air Zoom Pegasus 40',
    nameRu: 'Кроссовки Nike Air Zoom Pegasus 40',
    description: 'Лёгкие и удобные кроссовки для бега и повседневной носки.',
    price: 129.99,
    oldPrice: 149.99,
    discountPercent: 13,
    brand: 'Nike',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 15,
    size: '42'
  },
  {
    id: '2',
    sku: 'SHO-002',
    name: 'Adidas Ultraboost 22',
    nameRu: 'Кроссовки Adidas Ultraboost 22',
    description: 'Максимальный комфорт и поддержка для любых дистанций.',
    price: 159.99,
    oldPrice: 189.99,
    discountPercent: 16,
    brand: 'Adidas',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 9,
    size: '43'
  },
  {
    id: '3',
    sku: 'SHO-003',
    name: 'Puma Velocity Nitro 3',
    nameRu: 'Кроссовки Puma Velocity Nitro 3',
    description: 'Амортизирующая подошва и лёгкий материал верха.',
    price: 119.99,
    oldPrice: 139.99,
    discountPercent: 14,
    brand: 'Puma',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 25,
    size: '41'
  }
];
