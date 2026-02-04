import { Component } from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-brands',
  imports: [
    RouterLink
  ],
  templateUrl: './brands.html',
  styleUrl: './brands.scss',
})
export class Brands {
  alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  brands = [
    { id: 1, name: 'Chanel', logoUrl: 'https://www.retail.ru/upload/iblock/6aa/f4b21hnj21c296516fhpwgv4xr7wiebj/1.jpeg' },
    { id: 2, name: 'Dior', logoUrl: 'https://yt3.googleusercontent.com/retS2O4yoIWDjEqYYIP1Q65ssG8f-eJofNmiOGuvVJYKPyvLj8zP_Z6cR7_Y3Q7qi2N9YxJTj7s=s900-c-k-c0x00ffffff-no-rj' },
  ];

  get groupedBrands() {
    return this.alphabet
      .map(letter => ({
        letter,
        brands: this.brands.filter(b => b.name.startsWith(letter))
      }))
      .filter(group => group.brands.length > 0);
  }

  hasBrandsForLetter(letter: string): boolean {
    return this.brands.some(b => b.name.startsWith(letter));
  }

  scrollToSection(letter: string) {
    const element = document.getElementById('section-' + letter);
    if (element) {
      element.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
  }
}
