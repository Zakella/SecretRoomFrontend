import {
  AfterViewInit, ChangeDetectionStrategy,
  Component, effect, inject,
  Inject, input,
  NgZone,
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
  private ngZone = inject(NgZone);
  public images = input<CarouselImage[]>([]);
  public indicator = input<boolean>(true);
  public controls = input<boolean>(true);
  public autoSlide = input<boolean>(true);
  public autoSlideSpeed = input<number>(10000);
  public indicators = input<boolean>(true);
  public selectedIndex = signal(0);
  private intervalId = signal<number | null>(null);
  private readonly isBrowser = signal<boolean>(false);
  startX = 0;
  endX = 0;
  private languageService = inject(Language);
  protected activeLang = this.languageService.currentLanguage
  private sanitizer = inject(DomSanitizer);

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser.set(isPlatformBrowser(platformId));

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
  }

  private restartAuto(): void {
    if (!this.isBrowser()) return;
    this.stopAuto();

    if (!this.autoSlide() || this.images().length < 2) return;
    // A never-ending interval inside the Angular zone keeps the app unstable,
    // which blocks hydration event replay; only the slide change re-enters the zone.
    this.intervalId.set(this.ngZone.runOutsideAngular(() => window.setInterval(() => {
      this.ngZone.run(() => this.selectedIndex.update(i => (i + 1) % this.images().length));
    }, this.autoSlideSpeed())));
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

  // Desktop and mobile variants are both rendered and switched by CSS media queries
  // (max-width: 768px), so the server markup matches the client and nothing moves on hydration.
  protected srcsetUrl(url: string): string {
    // srcset treats whitespace and commas as separators
    return url.replace(/ /g, '%20').replace(/,/g, '%2C');
  }

  protected getBgImage(url: string | undefined): string | null {
    // Quoted so that spaces or parentheses in uploaded file names keep the value valid
    return url ? 'url("' + url.replace(/["\\]/g, '\\$&') + '")' : null;
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

  protected getTitleFontSize(image: CarouselImage, mobile: boolean): string {
    const size = mobile && image.mobileTitleFontSize ? image.mobileTitleFontSize : (image.titleFontSize || 40);
    return size + 'px';
  }

  protected getSubtitleFontSize(image: CarouselImage, mobile: boolean): string {
    const size = mobile && image.mobileSubtitleFontSize ? image.mobileSubtitleFontSize : (image.subtitleFontSize || 16);
    return size + 'px';
  }

  private getTitlePosition(image: CarouselImage, mobile: boolean): string {
    if (mobile && image.mobileTitlePosition) {
      return image.mobileTitlePosition;
    }
    return image.titlePosition || 'bottom';
  }

  protected getTitleFontFamily(image: CarouselImage, mobile: boolean): string {
    if (mobile && image.mobileTitleFontFamily) {
      return image.mobileTitleFontFamily;
    }
    return image.titleFontFamily || 'Playfair Display, serif';
  }

  protected getSubtitleFontFamily(image: CarouselImage, mobile: boolean): string {
    return image.subtitleFontFamily || this.getTitleFontFamily(image, mobile);
  }

  protected getBadgePositionClass(image: CarouselImage): string {
    const desktop = image.badgePosition || 'top-right';
    const mobile = image.mobileBadgePosition || desktop;
    return this.badgeClass(desktop) + ' m-' + this.badgeClass(mobile);
  }

  private badgeClass(pos: string): string {
    switch (pos) {
      case 'top-left': return 'badge-top-left';
      case 'bottom-left': return 'badge-bottom-left';
      case 'bottom-right': return 'badge-bottom-right';
      default: return 'badge-top-right';
    }
  }

  protected getOverlayPositionClass(image: CarouselImage): string {
    const align = image.titleTextAlign || 'center';
    let classes: string;
    switch (this.getTitlePosition(image, false)) {
      case 'top': classes = 'overlay-top'; break;
      case 'center': classes = 'overlay-center'; break;
      default: classes = 'overlay-bottom';
    }
    if (this.getTitlePosition(image, true) === 'center') classes += ' m-overlay-center';
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

  /** Overlay geometry as CSS variables: `--ov-*` for desktop, `--ov-*-m` for mobile. */
  protected getOverlayPositionStyle(image: CarouselImage): Record<string, string> {
    const style: Record<string, string> = {};
    for (const mobile of [false, true]) {
      const suffix = mobile ? '-m' : '';
      const offsetX = mobile ? (image.mobileOverlayOffsetX ?? 20) : (image.overlayOffsetX ?? 40);
      const offsetY = mobile ? (image.mobileOverlayOffsetY ?? 60) : (image.overlayOffsetY ?? 60);
      const vertical = this.getTitlePosition(image, mobile);
      const align = image.titleTextAlign || 'center';

      // Vertical positioning
      style['--ov-top' + suffix] = vertical === 'top' ? offsetY + 'px' : (vertical === 'center' ? '50%' : 'auto');
      style['--ov-bottom' + suffix] = vertical === 'top' || vertical === 'center' ? 'auto' : offsetY + 'px';

      if (mobile) {
        // Mobile: full width, offsetX as padding
        style['--ov-left-m'] = '0';
        style['--ov-right-m'] = '0';
        style['--ov-width-m'] = '100%';
        style['--ov-px-m'] = offsetX + 'px';
      } else {
        // Desktop: position by alignment, capped width
        style['--ov-left'] = align === 'left' ? offsetX + 'px' : (align === 'right' ? 'auto' : '50%');
        style['--ov-right'] = align === 'right' ? offsetX + 'px' : 'auto';
        style['--ov-max-w'] = (image.overlayMaxWidth ?? 600) + 'px';
      }
    }
    return style;
  }

  protected goToImage(image: CarouselImage): void {
    this.router.navigate(['/', this.activeLang(), 'catalog', 'hero', image.id]);
  }
}
