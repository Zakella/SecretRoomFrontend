import {inject, Injectable, signal} from '@angular/core';
import {Subject} from 'rxjs';
import {debounceTime, distinctUntilChanged, switchMap, tap, catchError} from 'rxjs/operators';
import {of} from 'rxjs';
import {ProductService} from '../api/product';
import {Product} from '../../entities/product';

@Injectable({providedIn: 'root'})
export class SearchService {
  private productService = inject(ProductService);
  private searchSubject = new Subject<string>();

  query = signal('');
  suggestions = signal<Product[]>([]);
  loading = signal(false);
  showDropdown = signal(false);

  constructor() {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(q => {
        if (q.length < 2) {
          this.suggestions.set([]);
          this.showDropdown.set(false);
          this.loading.set(false);
        }
      }),
      switchMap(q => {
        if (q.length < 2) return of(null);
        this.loading.set(true);
        return this.productService.smartSearch(q, 0, 6).pipe(
          catchError(() => of(null))
        );
      })
    ).subscribe(res => {
      if (res) {
        this.suggestions.set(res.content);
        this.showDropdown.set(true);
      }
      this.loading.set(false);
    });
  }

  search(query: string) {
    this.query.set(query);
    if (query.trim().length < 2) {
      this.suggestions.set([]);
      this.showDropdown.set(false);
      this.loading.set(false);
    } else {
      this.loading.set(true);
      this.showDropdown.set(true);
    }
    this.searchSubject.next(query.trim());
  }

  clear() {
    this.query.set('');
    this.suggestions.set([]);
    this.loading.set(false);
    this.showDropdown.set(false);
  }
}
