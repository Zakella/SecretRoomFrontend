import {ChangeDetectionStrategy, Component, HostListener, signal, PLATFORM_ID, inject} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Component({
  selector: 'scroll-to-top',
  standalone: true,
  template: `
    @if (isVisible()) {
      <button class="scroll-top-btn" (click)="scrollToTop()" aria-label="Scroll to top">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 19V5M5 12l7-7 7 7"/>
        </svg>
      </button>
    }
  `,
  styles: [`
    .scroll-top-btn {
      position: fixed;
      bottom: 30px;
      right: 30px;
      width: 50px;
      height: 50px;
      border: none;
      background: #000;
      color: var(--gold, #b8956c);
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
      transition: transform 0.3s ease, background 0.3s ease;
      z-index: 1000;
      animation: fadeInUp 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        background: var(--gold, #b8956c);
        color: #000;
      }

      svg {
        transition: transform 0.3s ease;
      }

      &:hover svg {
        transform: translateY(-2px);
      }
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @media (max-width: 768px) {
      .scroll-top-btn {
        bottom: 100px;
        right: 20px;
        width: 44px;
        height: 44px;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScrollToTop {
  private platformId = inject(PLATFORM_ID);
  isVisible = signal(false);

  private scrollTicking = false;

  @HostListener('window:scroll')
  onScroll(): void {
    if (this.scrollTicking) return;
    this.scrollTicking = true;
    requestAnimationFrame(() => {
      if (isPlatformBrowser(this.platformId)) {
        this.isVisible.set(window.scrollY > 400);
      }
      this.scrollTicking = false;
    });
  }

  scrollToTop(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }
}