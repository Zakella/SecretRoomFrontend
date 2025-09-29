import {Component, HostListener, signal} from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  imports: [],
  templateUrl: './scroll-top.html',
  styleUrl: './scroll-top.scss'
})
export class ScrollTop {
  showButton = signal(false);

  @HostListener('window:scroll')
  onScroll() {
    this.showButton.set(window.scrollY > 300)
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
