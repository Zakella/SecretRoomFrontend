import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { Product } from '../../entities/product';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class RecentlyViewedService {
  private readonly STORAGE_KEY = 'recently_viewed_products';
  private readonly MAX_ITEMS = 10;
  private platformId = inject(PLATFORM_ID);

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
