import {Component, HostListener, signal} from '@angular/core';

@Component({
  selector: 'app-scroll-top',
  imports: [],
  templateUrl: './scroll-top.html',
  styleUrl: './scroll-top.scss'
})
export class ScrollTop {
  protected showButton = signal<boolean>(false);

  @HostListener('window:scroll')
  protected onScroll(): void {
    this.showButton.set(window.scrollY > 300)
  }

  protected scrollToTop(): void {
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
}
