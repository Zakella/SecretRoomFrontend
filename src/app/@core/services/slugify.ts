import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Slugify {

  transform(value: string): string {
    return value
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .replace(/[\s_]+/g, '-')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  }

  productUrl(lang: string, id: string, name: string): string[] {
    return ['/', lang, 'product', id, this.transform(name)];
  }
}