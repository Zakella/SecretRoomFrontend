import {Injectable, signal, Inject, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

const STORAGE_KEY = 'sr_favorites';

@Injectable({providedIn: 'root'})
export class FavoritesService {
  private ids = signal<Set<string>>(new Set());
  count = signal(0);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const arr = JSON.parse(stored) as string[];
          this.ids.set(new Set(arr));
          this.count.set(arr.length);
        } catch {}
      }
    }
  }

  isFavorite(productId: string): boolean {
    return this.ids().has(productId);
  }

  toggle(productId: string): boolean {
    const current = new Set(this.ids());
    if (current.has(productId)) {
      current.delete(productId);
    } else {
      current.add(productId);
    }
    this.ids.set(current);
    this.count.set(current.size);
    this.save(current);
    return current.has(productId);
  }

  getAll(): string[] {
    return Array.from(this.ids());
  }

  private save(ids: Set<string>) {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(ids)));
    }
  }
}
