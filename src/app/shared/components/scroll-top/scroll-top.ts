import {Component, HostListener} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-scroll-top',
  imports: [
    NgIf
  ],
  templateUrl: './scroll-top.html',
  styleUrl: './scroll-top.scss'
})
export class ScrollTop {
  showButton = false;

  @HostListener('window:scroll')
  onScroll() {
    this.showButton = window.scrollY > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
