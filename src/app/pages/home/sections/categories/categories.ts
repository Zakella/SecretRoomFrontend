import {Component, computed, inject, OnInit, signal} from '@angular/core';
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
})
export class Categories implements OnInit {
  private router = inject(Router);
  private languageService = inject(Language);
  private categoryService = inject(CategoryService);
  private slugify = inject(Slugify);

  currentLanguage = this.languageService.currentLanguage;
  private rawCategories = signal<any[]>([]);

  // Filter out categories with no products
  categories = computed(() =>
    this.rawCategories().filter(c => c.products?.length > 0)
  );

  currentIndex = 0;
  translateX = 0;
  readonly slideWidth = 360;
  readonly gap = 32;

  ngOnInit() {
    this.categoryService.getCategoriesWithPreview().subscribe(data => {
      this.rawCategories.set(data);
    });
  }

  next() {
    if (this.currentIndex < this.categories().length - 1) {
      this.currentIndex++;
      this.updatePosition();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updatePosition();
    }
  }

  private updatePosition() {
    this.translateX = -(this.currentIndex * (this.slideWidth + this.gap));
  }

  goToCategory(category: any) {
    // Use slug if available (generated from name), otherwise fallback to ID
    const name = category.categoryName || '';
    const slug = this.slugify.transform(name);
    const identifier = slug || category.categoryId;

    this.router.navigate([this.currentLanguage(), 'catalog', identifier]);
  }

  goToStatic(tag: string) {
    this.router.navigate([this.currentLanguage(), 'catalog', tag]);
  }

  getCollageImages(category: any): string[] {
    if (!category.products || category.products.length === 0) return [];
    return category.products.slice(0, 3).map((p: any) => p.imageURL);
  }
}
