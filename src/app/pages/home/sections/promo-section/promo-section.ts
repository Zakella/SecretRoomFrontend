import { Component } from '@angular/core';

@Component({
  selector: 'promo-section',
  imports: [],
  templateUrl: './promo-section.html',
  styleUrl: './promo-section.scss'
})
export class PromoSection {

  scrollLeft() {
    console.log('Scroll left');
  }

  scrollRight() {
    console.log('Scroll right');
  }
}
