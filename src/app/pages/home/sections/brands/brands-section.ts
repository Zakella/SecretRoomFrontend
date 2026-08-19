import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../../../@core/services/language';
import {BrandService} from '../../../../@core/api/brand';
import {Brand} from '../../../../entities/category';

/**
 * Блок брендов на главной.
 *
 * До этого с главной не вело ни одной ссылки на /{lang}/catalog/brand/*, единственным входом
 * была страница /{lang}/brands — по одной ссылке на бренд. Отсюда «Discovered — currently
 * not indexed» у половины брендовых страниц. Ссылки здесь — настоящие <a href> (routerLink),
 * а не router.navigate по клику, чтобы их видел краулер в SSR-выдаче.
 */
@Component({
  selector: 'brands-section',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './brands-section.html',
  styleUrl: './brands-section.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BrandsSection implements OnInit {
  private brandService = inject(BrandService);
  private languageService = inject(Language);

  currentLanguage = this.languageService.currentLanguage;
  brands = signal<Brand[]>([]);

  ngOnInit(): void {
    this.brandService.gerAllBrands().subscribe(brands => this.brands.set(brands ?? []));
  }

  brandSlug(brand: Brand): string {
    return this.brandService.toSlug(brand.brand);
  }

  displayName(brand: Brand): string {
    return brand.brandAlias || brand.brand;
  }
}
