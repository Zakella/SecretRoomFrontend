import {
  AfterViewInit, ChangeDetectionStrategy,
  Component, effect, inject,
  Inject, input,
  OnDestroy,
  PLATFORM_ID,
  signal,
  untracked,
} from '@angular/core';
import {isPlatformBrowser, NgClass, NgStyle} from '@angular/common';
import {DomSanitizer, SafeStyle} from '@angular/platform-browser';
import {CarouselImage} from '../../../entities/carousel-image';
import {Router} from '@angular/router';
import {Language} from '../../../@core/services/language';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'image-slider',
  imports: [NgClass, NgStyle, TranslocoPipe],
  templateUrl: './image-slider.html',
  styleUrl: './image-slider.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImageSlider implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  public images = input<CarouselImage[]>([]);
  public indicator = input<boolean>(true);
  public controls = input<boolean>(true);
  public autoSlide = input<boolean>(true);
  public autoSlideSpeed = input<number>(10000);
  public indicators = input<boolean>(true);
  public selectedIndex = signal(0);
  private intervalId = signal<number | null>(null);
  private readonly isBrowser = signal<boolean>(false);
  protected isMobile = signal(false);
  startX = 0;
  endX = 0;
  private languageService = inject(Language);
  protected activeLang = this.languageService.currentLanguage
  private sanitizer = inject(DomSanitizer);
  private resizeListener: (() => void) | null = null;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser.set(isPlatformBrowser(platformId));
    if (this.isBrowser()) {
      this.isMobile.set(window.innerWidth <= 768);
      this.resizeListener = () => this.isMobile.set(window.innerWidth <= 768);
      window.addEventListener('resize', this.resizeListener);
    }

    effect(() => {
      this.images();
      this.autoSlide();
      this.autoSlideSpeed();
      untracked(() => this.restartAuto());
    });
  }

  ngAfterViewInit(): void {
    this.restartAuto();
  }

  ngOnDestroy(): void {
    this.stopAuto();
    if (this.resizeListener) {
      window.removeEventListener('resize', this.resizeListener);
    }
  }

  private restartAuto(): void {
    if (!this.isBrowser()) return;
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

  protected onDragStart(event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      this.startX = event.clientX;
    } else if (event instanceof TouchEvent) {
      this.startX = event.touches[0].clientX;
    }
  }

  protected onDragEnd(event: MouseEvent | TouchEvent) {
    if (event instanceof MouseEvent) {
      this.endX = event.clientX;
    } else if (event instanceof TouchEvent) {
      this.endX = event.changedTouches[0].clientX;
    }

    const delta = this.endX - this.startX;
    if (delta > 50) {
      this.onPrevClick();
    } else if (delta < -50) {
      this.onNextClick();
    }
  }

  protected getImageUrl(image: CarouselImage): string {
    if (this.isMobile() && image.mobileImageUrl) {
      return image.mobileImageUrl;
    }
    return image.imageUrl;
  }

  protected getBadgeText(image: CarouselImage): string {
    return this.activeLang() === 'ro' ? (image.badgeRo || '') : (image.badgeRu || '');
  }

  protected getCtaText(image: CarouselImage): string {
    return this.activeLang() === 'ro' ? (image.ctaTextRo || '') : (image.ctaTextRu || '');
  }

  protected getOverlayStyle(image: CarouselImage): SafeStyle {
    const direction = image.gradientDirection || 'to-top';
    if (direction === 'none') {
      return this.sanitizer.bypassSecurityTrustStyle('none');
    }
    const cssDirection = direction === 'to-bottom' ? 'to bottom' : 'to top';
    const opacity = (image.overlayOpacity ?? 60) / 100;
    const gradient = `linear-gradient(${cssDirection}, rgba(0,0,0,${opacity}) 0%, rgba(0,0,0,${opacity * 0.25}) 40%, rgba(0,0,0,0) 70%)`;
    return this.sanitizer.bypassSecurityTrustStyle(gradient);
  }

  protected getSubtitleText(image: CarouselImage): string {
    return this.activeLang() === 'ro' ? (image.subtitleRo || '') : (image.subtitleRu || '');
  }

  protected getTitleFontSize(image: CarouselImage): number {
    if (this.isMobile() && image.mobileTitleFontSize) {
      return image.mobileTitleFontSize;
    }
    return image.titleFontSize || 40;
  }

  protected getSubtitleFontSize(image: CarouselImage): number {
    if (this.isMobile() && image.mobileSubtitleFontSize) {
      return image.mobileSubtitleFontSize;
    }
    return image.subtitleFontSize || 16;
  }

  protected getTitlePosition(image: CarouselImage): string {
    if (this.isMobile() && image.mobileTitlePosition) {
      return image.mobileTitlePosition;
    }
    return image.titlePosition || 'bottom';
  }

  protected getTitleFontFamily(image: CarouselImage): string {
    if (this.isMobile() && image.mobileTitleFontFamily) {
      return image.mobileTitleFontFamily;
    }
    return image.titleFontFamily || 'Playfair Display, serif';
  }

  protected getSubtitleFontFamily(image: CarouselImage): string {
    return image.subtitleFontFamily || this.getTitleFontFamily(image);
  }

  protected getBadgePositionClass(image: CarouselImage): string {
    const pos = (this.isMobile() && image.mobileBadgePosition)
      ? image.mobileBadgePosition
      : (image.badgePosition || 'top-right');
    switch (pos) {
      case 'top-left': return 'badge-top-left';
      case 'bottom-left': return 'badge-bottom-left';
      case 'bottom-right': return 'badge-bottom-right';
      default: return 'badge-top-right';
    }
  }

  protected getOverlayPositionClass(image: CarouselImage): string {
    const vertical = this.getTitlePosition(image);
    const align = image.titleTextAlign || 'center';
    let classes = '';
    switch (vertical) {
      case 'top': classes = 'overlay-top'; break;
      case 'center': classes = 'overlay-center'; break;
      default: classes = 'overlay-bottom';
    }
    if (align === 'left') classes += ' align-left';
    else if (align === 'right') classes += ' align-right';
    return classes;
  }

  protected getImageFilterStyle(image: CarouselImage): string {
    switch (image.imageFilter) {
      case 'grayscale': return 'grayscale(100%)';
      case 'sepia': return 'sepia(80%)';
      case 'brightness': return 'brightness(1.15)';
      case 'contrast': return 'contrast(1.2)';
      default: return 'none';
    }
  }

  protected getCtaClasses(image: CarouselImage): string {
    const style = image.ctaStyle || 'solid';
    if (style === 'outline') return 'slide-cta cta-outline';
    if (style === 'ghost') return 'slide-cta cta-ghost';
    return 'slide-cta';
  }

  protected getOverlayPositionStyle(image: CarouselImage): Record<string, string> {
    const mobile = this.isMobile();
    const offsetX = mobile ? (image.mobileOverlayOffsetX ?? 20) : (image.overlayOffsetX ?? 40);
    const offsetY = mobile ? (image.mobileOverlayOffsetY ?? 60) : (image.overlayOffsetY ?? 60);
    const vertical = this.getTitlePosition(image);
    const align = image.titleTextAlign || 'center';
    const style: Record<string, string> = {};

    // Vertical positioning
    if (vertical === 'top') {
      style['top'] = offsetY + 'px';
    } else if (vertical === 'center') {
      style['top'] = '50%';
    } else {
      style['bottom'] = offsetY + 'px';
    }

    // Max width
    const maxWidth = image.overlayMaxWidth ?? 600;
    if (!mobile) {
      style['max-width'] = maxWidth + 'px';
    }

    if (mobile) {
      // Mobile: full width, offsetX as padding
      style['left'] = '0';
      style['right'] = '0';
      style['width'] = '100%';
      style['padding-left'] = offsetX + 'px';
      style['padding-right'] = offsetX + 'px';
    } else {
      // Desktop: position by alignment
      if (align === 'left') {
        style['left'] = offsetX + 'px';
      } else if (align === 'right') {
        style['right'] = offsetX + 'px';
      } else {
        style['left'] = '50%';
      }
    }

    return style;
  }

  protected goToImage(image: CarouselImage): void {
    this.router.navigate(['/', this.activeLang(), 'catalog', 'hero', image.id]);
  }
}
