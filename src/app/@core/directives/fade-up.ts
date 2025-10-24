import {AfterViewInit, Directive, ElementRef, inject, Renderer2} from '@angular/core';

@Directive({
  selector: '[appFadeUp]'
})
export class FadeUp implements AfterViewInit {
  private el = inject(ElementRef);
  private renderer = inject(Renderer2);

  ngAfterViewInit(): void {
    this.renderer.addClass(this.el.nativeElement, 'fade-in');
  }
}
