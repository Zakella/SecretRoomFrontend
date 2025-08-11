import {Component, Inject, OnInit, PLATFORM_ID} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'app-modal-certificate',
  imports: [],
  templateUrl: './modal-certificate.html',
  styleUrl: './modal-certificate.scss'
})
export class ModalCertificate implements OnInit {
  isVisible = true;
  hasShown = false;
  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      const shown = localStorage.getItem('certificateShown');
      if (shown === 'true') {
        this.hasShown = true;
      }
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  onScroll = (): void => {
    if (!this.isBrowser || this.hasShown) return;

    const scrolled = window.scrollY;
    if (scrolled > 1550) {
      this.isVisible = true;
      this.hasShown = true;
      localStorage.setItem('certificateShown', 'true');
      window.removeEventListener('scroll', this.onScroll);
    }
  };

  close(): void {
    this.isVisible = false;
  }
}
