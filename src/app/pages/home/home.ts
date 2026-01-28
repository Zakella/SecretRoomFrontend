import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {imageSliderMock} from '../../mock/image-skider-mock';
import {Socials} from '../socials/socials';
import {PromoSection} from './promo-section/promo-section';
import {ProductService} from '../../@core/api/product';
import {Product} from '../../entities/product';

@Component({
  selector: 'app-home',
  imports: [ImageSlider, BestSellers, TextSlider, FadeUp, Socials, PromoSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  images = imageSliderMock;
  private productService = inject(ProductService);
  protected bestSellers = signal<Product[]>([]);

  ngOnInit(): void {
    this.getBestsellers();
  }


  getBestsellers() {
    this.productService.getBestSellers(1, 3).subscribe(res => {
      console.log(res);
      this.bestSellers.set(res.content);
    });
  }

}
