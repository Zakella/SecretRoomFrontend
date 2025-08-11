import {AfterViewInit, Directive, ElementRef, inject, OnDestroy, OnInit, PLATFORM_ID, Renderer2} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Directive({
  selector: '[appFadeUp]'
})
export class FadeUp  implements AfterViewInit {

  constructor(private el: ElementRef, private renderer: Renderer2) {
  }

  ngAfterViewInit(): void {
    this.renderer.addClass(this.el.nativeElement, 'fade-in');
  }
}
