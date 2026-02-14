import {ChangeDetectionStrategy, Component, Inject, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'app-modal-certificate',
  imports: [],
  templateUrl: './modal-certificate.html',
  styleUrl: './modal-certificate.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalCertificate implements OnInit {
  isVisible = signal<boolean>(true);
  hasShown = signal<boolean>(false);
  isBrowser = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser.set(isPlatformBrowser(this.platformId))
  }

  ngOnInit(): void {
    if (this.isBrowser()) {
      const shown = localStorage.getItem('certificateShown');
      if (shown === 'true') {
        this.hasShown.set(true);
      }
      window.addEventListener('scroll', this.onScroll, { passive: true });
    }
  }

  onScroll = (): void => {
    if (!this.isBrowser || this.hasShown()) return;

    const scrolled = window.scrollY;
    if (scrolled > 1550) {
      this.isVisible.set(true)
      this.hasShown.set(true);
      localStorage.setItem('certificateShown', 'true');
      window.removeEventListener('scroll', this.onScroll);
    }
  };

  close(): void {
    this.isVisible.set(false)
  }
}
