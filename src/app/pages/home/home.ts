import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {ScrollReveal} from '../../@core/directives/scroll-reveal';
import {ProductService} from '../../@core/api/product';
import {catchError, map, of} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {BestSellers} from './sections/best-sellers/best-sellers';
import {NewArrivals} from './sections/new-arrivals/new-arrivals';
import {Sales} from './sections/sales/sales';
import {Categories} from './sections/categories/categories';
import {Socials} from './sections/socials/socials';
import {InstagramFeed} from './sections/instagram-feed/instagram-feed';
import {HeroService} from '../../@core/api/hero';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-home',
  imports: [
    ImageSlider,
    BestSellers,
    ScrollReveal,
    Socials,
    NewArrivals,
    Sales,
    Categories,
    InstagramFeed,
    AsyncPipe,
    TranslocoPipe
  ],
  providers: [ProductService],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit {
  private productService = inject(ProductService);
  private heroService = inject(HeroService);
  private metaService = inject(MetaService);
  private langService = inject(Language);

  protected readonly bestSellers$ = this.productService.getBestSellers(0, 3).pipe(
    map(res => res?.content ?? []),
    catchError(() => of([]))
  );
  protected readonly newArrivals$ = this.productService.getNewArrivals(0, 10).pipe(
    map(res => res?.content ?? []),
    catchError(() => of([]))
  );
  protected readonly sales$ = this.productService.getSales(0, 5).pipe(
    map(res => res?.content ?? []),
    catchError(() => of([]))
  );
  protected readonly heroItems$ = this.heroService.getActiveHeroItems().pipe(
    map(res => res)
  )

  ngOnInit() {
    const isRo = this.langService.currentLanguage() === 'ro';

    // Более агрессивный Title для общих запросов
    const title = isRo
      ? "Magazin de Cosmetice și Lenjerie în Moldova | Secret Room"
      : "Магазин Косметики и Белья в Молдове | Secret Room";

    const description = isRo
      ? "Secret Room - destinația ta pentru cosmetice originale, parfumuri de lux și lenjerie intimă. Victoria's Secret, Bath & Body Works și alte branduri renumite. Livrare în Chișinău."
      : "Secret Room - ваш выбор оригинальной косметики, элитной парфюмерии и нижнего белья. Victoria's Secret, Bath & Body Works и другие известные бренды. Доставка по Кишиневу.";

    this.metaService.updateTitle(title);
    this.metaService.updateDescription(description);
    this.metaService.updateKeywords("cosmetica, parfumuri, lenjerie, cadouri, magazin online moldova, косметика, парфюмерия, белье, подарки, интернет магазин молдова");
    this.metaService.updateImage("https://secretroom.md/assets/images/logo/secretroom.png");
    this.metaService.updateUrl("https://secretroom.md/");

    // Добавляем разметку Organization и WebSite
    this.metaService.setOrganizationJsonLd();
    this.metaService.setWebSiteJsonLd();
  }
}
