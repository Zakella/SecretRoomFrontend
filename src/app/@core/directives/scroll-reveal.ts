import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Directive({
  selector: '[scrollReveal]',
  standalone: true
})
export class ScrollReveal implements OnInit, OnDestroy {
  private el = inject(ElementRef);
  private platformId = inject(PLATFORM_ID);
  private observer: IntersectionObserver | null = null;

  @Input() scrollReveal: 'fade-up' | 'fade-in' | 'fade-left' | 'fade-right' | 'zoom-in' = 'fade-up';
  @Input() revealDelay: number = 0;
  @Input() revealThreshold: number = 0.15;

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const element = this.el.nativeElement as HTMLElement;

    // Set initial hidden state
    element.style.opacity = '0';
    element.style.transition = `opacity 0.8s ease, transform 0.8s ease`;
    element.style.transitionDelay = `${this.revealDelay}ms`;

    this.setInitialTransform(element);

    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            this.reveal(element);
            this.observer?.unobserve(element);
          }
        });
      },
      {
        threshold: this.revealThreshold,
        rootMargin: '0px 0px -50px 0px'
      }
    );

    this.observer.observe(element);
  }

  private setInitialTransform(element: HTMLElement): void {
    switch (this.scrollReveal) {
      case 'fade-up':
        element.style.transform = 'translateY(40px)';
        break;
      case 'fade-left':
        element.style.transform = 'translateX(-40px)';
        break;
      case 'fade-right':
        element.style.transform = 'translateX(40px)';
        break;
      case 'zoom-in':
        element.style.transform = 'scale(0.95)';
        break;
      case 'fade-in':
      default:
        element.style.transform = 'none';
        break;
    }
  }

  private reveal(element: HTMLElement): void {
    element.style.opacity = '1';
    element.style.transform = 'translateY(0) translateX(0) scale(1)';
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}