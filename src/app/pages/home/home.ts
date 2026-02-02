import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {imageSliderMock} from '../../mock/image-skider-mock';
import {ProductService} from '../../@core/api/product';
import {map} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {BestSellers} from './sections/best-sellers/best-sellers';
import {NewArrivals} from './sections/new-arrivals/new-arrivals';
import {Categories} from './sections/categories/categories';
import {Socials} from './sections/socials/socials';
import {Hero} from '../../@core/api/hero';

@Component({
  selector: 'app-home',
  imports: [
    ImageSlider,
    BestSellers,
    TextSlider,
    FadeUp,
    Socials,
    NewArrivals,
    Categories,
    AsyncPipe,
    Socials
  ],
  providers: [ProductService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  private productService = inject(ProductService);
  private heroService = inject(Hero)
  protected readonly bestSellers$ = this.productService.getBestSellers(1, 3).pipe(
    map(res => res.content)
  );
  protected readonly newArrivals$ = this.productService.getNewArrivals(1, 10).pipe(
    map(res => res.content)
  );
  protected readonly heroItems$ = this.heroService.getActiveHeroItems().pipe(
    map(res => res)
  )
}
