import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { Product } from '../../entities/product';
import { isPlatformBrowser } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { EMPTY, catchError, finalize, from, mergeMap, tap } from 'rxjs';
import { ProductService } from '../api/product';

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private readonly STORAGE_KEY = 'recently_viewed_products';
  private readonly MAX_ITEMS = 10;
  private readonly CONCURRENCY = 3;
  private platformId = inject(PLATFORM_ID);
  private productService = inject(ProductService);
  private revalidated = false;

  readonly products = signal<Product[]>([]);

  constructor() {
    this.loadFromStorage();
  }

  addProduct(product: Product): void {
    if (!isPlatformBrowser(this.platformId)) return;
    if (!product || !product.id) return;

    const current = this.products();
    // Remove if exists to move to top
    const filtered = current.filter(p => p.id !== product.id);

    // Add to beginning
    const updated = [product, ...filtered].slice(0, this.MAX_ITEMS);

    this.products.set(updated);
    this.saveToStorage(updated);
  }

  /**
   * SR-173: в localStorage лежат снимки Product — товар, снятый с продажи после просмотра,
   * остаётся в карусели. Один раз за сессию перепроверяем сохранённые id: 404 — убираем
   * из списка и localStorage, успех — подтягиваем свежие данные (цена/фото).
   * Сетевые ошибки и 5xx не повод выбрасывать товар — оставляем как есть.
   */
  revalidate(): void {
    if (!isPlatformBrowser(this.platformId) || this.revalidated) return;
    this.revalidated = true;

    const ids = this.products().map(p => p.id).filter((id): id is string => !!id);
    if (!ids.length) return;

    const fresh = new Map<string, Product>();
    const gone = new Set<string>();

    from(ids).pipe(
      mergeMap(id => this.productService.getProductById(id, true).pipe(
        tap(product => fresh.set(id, product)),
        catchError((err: HttpErrorResponse) => {
          if (err.status === 404) gone.add(id);
          return EMPTY;
        })
      ), this.CONCURRENCY),
      finalize(() => this.applyRevalidation(fresh, gone))
    ).subscribe();
  }

  private applyRevalidation(fresh: Map<string, Product>, gone: Set<string>): void {
    if (!fresh.size && !gone.size) return;
    // список мог измениться, пока шли запросы (addProduct) — применяем к текущему
    const updated = this.products()
      .filter(p => !(p.id && gone.has(p.id)))
      .map(p => (p.id && fresh.get(p.id)) || p);
    this.products.set(updated);
    this.saveToStorage(updated);
  }

  private loadFromStorage(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.products.set(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load recently viewed products', e);
    }
  }

  private saveToStorage(products: Product[]): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(products));
    } catch (e) {
      console.error('Failed to save recently viewed products', e);
    }
  }
}
