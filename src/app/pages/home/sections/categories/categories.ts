import {Component, input, OnChanges} from '@angular/core';

@Component({
  selector: 'categories',
  imports: [],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnChanges{
/*  items = [
    { id: 1, label: 'Panties', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 2, label: 'Sleep', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 3, label: 'Lingerie', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 4, label: 'VSX', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 5, label: 'Accessories', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 6, label: 'Beauty', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' },
    { id: 7, label: 'Swim', image: 'https://www.victoriassecret.com/images/vsweb/feaaa496-4834-4109-9dda-4b93901d661b/012026-carousel-sexy-night-in.jpg' }
  ];*/
  categories = input<any[]>([]);


  ngOnChanges() {
    console.log(this.categories())
  }
  currentIndex = 0;
  translateX = 0;
  readonly slideWidth = 360;
  readonly gap = 32;

  next() {
    if (this.currentIndex < this.categories().length - 1) {
      this.currentIndex++;
      this.updatePosition();
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.updatePosition();
    }
  }

  private updatePosition() {
    this.translateX = -(this.currentIndex * (this.slideWidth + this.gap));
  }
}
