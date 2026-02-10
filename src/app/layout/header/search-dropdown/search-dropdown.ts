import {ChangeDetectionStrategy, Component, inject, output} from '@angular/core';
import {Router} from '@angular/router';
import {SearchService} from '../../../@core/services/search';
import {Language} from '../../../@core/services/language';
import {Product} from '../../../entities/product';
import {TranslocoPipe} from '@ngneat/transloco';
import {LocalizedNamePipe} from '../../../shared/pipes/localized-name.pipe';
import {Slugify} from '../../../@core/services/slugify';
import {ProductPrice} from '../../../shared/components/product/product-price/product-price';

@Component({
  selector: 'search-dropdown',
  standalone: true,
  imports: [TranslocoPipe, LocalizedNamePipe, ProductPrice],
  templateUrl: './search-dropdown.html',
  styleUrl: './search-dropdown.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SearchDropdown {
  searchService = inject(SearchService);
  private router = inject(Router);
  private langService = inject(Language);
  private slugify = inject(Slugify);
  closed = output<void>();

  suggestions = this.searchService.suggestions;
  loading = this.searchService.loading;
  query = this.searchService.query;

  goToProduct(product: Product) {
    this.searchService.clear();
    this.closed.emit();
    this.router.navigate(this.slugify.productUrl(this.langService.currentLanguage(), product.id!, product.name ?? ''));
  }

  showAll() {
    const q = this.query().trim();
    if (!q) return;
    this.searchService.clear();
    this.closed.emit();
    this.router.navigate(['/', this.langService.currentLanguage(), 'search', q]);
  }
}
