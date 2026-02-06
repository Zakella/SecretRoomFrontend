import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {ScrollReveal} from '../../@core/directives/scroll-reveal';
import {ProductService} from '../../@core/api/product';
import {map} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {BestSellers} from './sections/best-sellers/best-sellers';
import {NewArrivals} from './sections/new-arrivals/new-arrivals';
import {Sales} from './sections/sales/sales';
import {Categories} from './sections/categories/categories';
import {Socials} from './sections/socials/socials';
import {InstagramFeed} from './sections/instagram-feed/instagram-feed';
import {HeroService} from '../../@core/api/hero';
import {CategoryService} from '../../@core/api/category';

@Component({
  selector: 'app-home',
  imports: [
    ImageSlider,
    BestSellers,
    FadeUp,
    ScrollReveal,
    Socials,
    NewArrivals,
    Sales,
    Categories,
    InstagramFeed,
    AsyncPipe
  ],
  providers: [ProductService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  private productService = inject(ProductService);
  private heroService = inject(HeroService)
  private categoryService = inject(CategoryService);
  protected readonly bestSellers$ = this.productService.getBestSellers(1, 3).pipe(
    map(res => res.content)
  );
  protected readonly newArrivals$ = this.productService.getNewArrivals(1, 10).pipe(
    map(res => res.content)
  );
  protected readonly sales$ = this.productService.getSales(0, 5).pipe(
    map(res => res?.content ?? [])
  );
  protected readonly heroItems$ = this.heroService.getActiveHeroItems().pipe(
    map(res => res)
  )
  protected readonly categories$ = this.categoryService.getCategories().pipe(
    map(res => res)
  )
}
