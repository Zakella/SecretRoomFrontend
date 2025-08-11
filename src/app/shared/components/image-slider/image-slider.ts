import {Component, Input, OnInit} from '@angular/core';
import {CommonModule, NgClass, NgStyle} from '@angular/common';

@Component({
  selector: 'app-image-slider',
  imports: [
    NgStyle,
    NgClass
  ],
  templateUrl: './image-slider.html',
  styleUrl: './image-slider.scss'
})
export class ImageSlider {
 /* @Input() slides: any[] = [];
  @Input() indicatorsVisible = true;
  @Input() animationSpeed = 500;
  @Input() autoPlay = false;
  @Input() autoPlaySpeed = 3000;
  currentSlide = 0;
  hidden = false;
  intervalId: any;


  next() {
    let currentSlide = (this.currentSlide + 1) % this.slides.length;
    this.jumpToSlide(currentSlide);
  }

  previous() {
    let currentSlide =
      (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    this.jumpToSlide(currentSlide);
  }

  jumpToSlide(index: number) {
    this.hidden = true;
    setTimeout(() => {
      this.currentSlide = index;
      this.hidden = false;
    }, this.animationSpeed);
  }


  ngOnInit() {
    if (this.autoPlay) {
      this.intervalId = setInterval(() => {
        this.next();
      }, this.autoPlaySpeed);
    }
  }


  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }*/
}
