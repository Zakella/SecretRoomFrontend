import {
  AfterViewInit, ChangeDetectionStrategy,
  Component,
  Inject, input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  signal,
  SimpleChanges
} from '@angular/core';
import {isPlatformBrowser, NgClass,} from '@angular/common';

interface carouselImage {
  imageSrc: string,
  imageAlt: string,
}

@Component({
  selector: 'app-image-slider',
  imports: [NgClass],
  templateUrl: './image-slider.html',
  styleUrl: './image-slider.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageSlider implements AfterViewInit, OnDestroy, OnChanges {
  public images = input<carouselImage[]>([]);
  public indicator = input<boolean>(true);
  public controls = input<boolean>(true);
  public autoSlide = input<boolean>(true);
  public autoSlideSpeed = input<number>(5000);
  public indicators = input<boolean>(true);
  public selectedIndex = signal(0);
  private intervalId = signal<number | null>(null);
  private readonly isBrowser = signal<boolean>(false);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser.set(isPlatformBrowser(platformId));
  }

  ngAfterViewInit(): void {
    this.restartAuto();
  }

  ngOnChanges(ch: SimpleChanges): void {
    if ('images' in ch || 'autoSlide' in ch || 'autoSlideSpeed' in ch) {
      this.restartAuto();
    }
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }

  private restartAuto(): void {
    if (!this.isBrowser) return;
    this.stopAuto();

    if (!this.autoSlide() || this.images().length < 2) return;
    this.intervalId.set(window.setInterval(() => {
      this.selectedIndex.update(i => (i + 1) % this.images().length);
    }, this.autoSlideSpeed()))
  }

  private stopAuto(): void {
    if (this.intervalId() != null) {
      clearInterval(this.intervalId()!);
      this.intervalId.set(null);
    }
  }


  protected selectImage(i: number): void {
    this.selectedIndex.set(i);
  }

  protected onPrevClick(): void {
    if (!this.images().length) return;
    this.selectedIndex.update(i => (i - 1 + this.images().length) % this.images().length);
  }

  protected onNextClick(): void {
    if (!this.images().length) return;
    this.selectedIndex.update(i => (i + 1) % this.images().length);
  }
}
