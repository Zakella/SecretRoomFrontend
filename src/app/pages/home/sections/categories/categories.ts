import {Component, inject, OnInit, signal} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {Router} from '@angular/router';
import {Language} from '../../../../@core/services/language';
import {CategoryService} from '../../../../@core/api/category';

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

  currentLanguage = this.languageService.currentLanguage;
  categories = signal<any[]>([]);

  currentIndex = 0;
  translateX = 0;
  readonly slideWidth = 360;
  readonly gap = 32;

  ngOnInit() {
    this.categoryService.getCategoriesWithPreview().subscribe(data => {
      this.categories.set(data);
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
    this.router.navigate([this.currentLanguage(), 'catalog', category.categoryId]);
  }

  getCollageImages(category: any): string[] {
    if (!category.products || category.products.length === 0) return [];
    // Take up to 3 images for collage
    return category.products.slice(0, 3).map((p: any) => p.imageURL);
  }
}
