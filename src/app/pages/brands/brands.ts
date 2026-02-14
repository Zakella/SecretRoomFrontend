import {ChangeDetectionStrategy, Component, computed, inject, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';
import {BrandService} from '../../@core/api/brand';
import {Brand} from '../../entities/category';

@Component({
  selector: 'app-brands',
  imports: [
    RouterLink,
    TranslocoPipe
  ],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Brands implements OnInit {
  private metaService = inject(MetaService);
  private langService = inject(Language);
  private brandService = inject(BrandService);
  private platformId = inject(PLATFORM_ID);

  activeLang = this.langService.currentLanguage;
  brands = signal<Brand[]>([]);
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  groupedBrands = computed(() =>
    this.alphabet
      .map(letter => ({
        letter,
        brands: this.brands().filter(b => this.displayName(b).toUpperCase().startsWith(letter))
      }))
      .filter(group => group.brands.length > 0)
  );

  brandsPerLetter = computed(() => {
    const set = new Set<string>();
    for (const b of this.brands()) {
      const first = this.displayName(b).charAt(0).toUpperCase();
      set.add(first);
    }
    return set;
  });

  ngOnInit() {
    const isRo = this.activeLang() === 'ro';
    this.metaService.updateTitle(
      isRo
        ? 'Branduri originale în Moldova — Victoria\'s Secret, Bath & Body Works | Secret Room'
        : 'Оригинальные бренды в Молдове — Victoria\'s Secret, Bath & Body Works | Secret Room'
    );
    this.metaService.updateDescription(
      isRo
        ? 'Toate brandurile disponibile în magazinul Secret Room Moldova. Produse originale: lenjerie, cosmetice, parfumuri de la cele mai populare branduri mondiale.'
        : 'Все бренды в магазине Secret Room Молдова. Оригинальная продукция: бельё, косметика, парфюмерия от самых популярных мировых брендов.'
    );
    this.metaService.updateKeywords(
      'Secret Room brands, branduri Moldova, Victoria\'s Secret Moldova, Bath Body Works Moldova, оригинальные бренды Молдова'
    );

    this.brandService.gerAllBrands().subscribe(brands => {
      this.brands.set([...brands].sort((a, b) => this.displayName(a).localeCompare(this.displayName(b))));
    });
  }

  displayName(brand: Brand): string {
    return brand.brandAlias || brand.brand;
  }

  brandSlug(brand: Brand): string {
    return this.brandService.toSlug(brand.brand);
  }

  hasBrandsForLetter(letter: string): boolean {
    return this.brandsPerLetter().has(letter);
  }

  scrollToSection(letter: string) {
    if (!isPlatformBrowser(this.platformId)) return;
    const element = document.getElementById('section-' + letter);
    if (element) {
      element.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }
}
