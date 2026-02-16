import {ChangeDetectionStrategy, Component, computed, ElementRef, inject, OnInit, PLATFORM_ID, signal, viewChild} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {TranslocoPipe} from '@ngneat/transloco';
import {Router} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {CategoryService} from '../../../../@core/api/category';
import {Slugify} from '../../../../@core/services/slugify';

@Component({
  selector: 'categories',
  imports: [
    TranslocoPipe
  ],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Categories implements OnInit {
  private router = inject(Router);
  private languageService = inject(Language);
  private categoryService = inject(CategoryService);
  private slugify = inject(Slugify);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  currentLanguage = this.languageService.currentLanguage;
  private rawCategories = signal<any[]>([]);

  // Filter out categories with no products
  categories = computed(() =>
    this.rawCategories().filter(c => c.products?.length > 0)
  );

  currentIndex = 0;
  translateX = 0;
  readonly gap = 32;

  private sliderRef = viewChild<ElementRef<HTMLElement>>('slider');

  ngOnInit() {
    this.categoryService.getCategoriesWithPreview().subscribe(data => {
      this.rawCategories.set(data);
    });
  }

  private get slideStep(): number {
    const el = this.sliderRef()?.nativeElement;
    if (el) {
      const slide = el.querySelector('.slide:not(.mobile-only)') as HTMLElement;
      if (slide) return slide.offsetWidth + this.gap;
    }
    const width = this.isBrowser ? window.innerWidth : 1200;
    return (width <= 1024 ? 300 : 360) + this.gap;
  }

  get maxIndex(): number {
    const el = this.sliderRef()?.nativeElement;
    const fallbackWidth = this.isBrowser ? window.innerWidth - 200 : 1000;
    const containerWidth = el?.offsetWidth ?? fallbackWidth;
    const visibleCount = Math.max(1, Math.floor(containerWidth / this.slideStep));
    return Math.max(0, this.categories().length - visibleCount);
  }

  next() {
    if (this.currentIndex < this.maxIndex) {
      this.currentIndex++;
      this.translateX = -(this.currentIndex * this.slideStep);
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.translateX = -(this.currentIndex * this.slideStep);
    }
  }

  goToCategory(category: any) {
    // Use slug if available (generated from name), otherwise fallback to ID
    const name = category.categoryName || '';
    const slug = this.slugify.transform(name);
    const identifier = slug || category.categoryId;

    this.router.navigate(['/', this.currentLanguage(), 'catalog', identifier]);
  }

  goToStatic(tag: string) {
    this.router.navigate(['/', this.currentLanguage(), 'catalog', tag]);
  }

  getCollageImages(category: any): string[] {
    if (!category.products || category.products.length === 0) return [];
    return category.products.map((p: any) => p.imageURL);
  }
}
