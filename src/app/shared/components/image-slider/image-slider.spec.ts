import {ApplicationRef, PLATFORM_ID, signal} from '@angular/core';
import {ComponentFixture, discardPeriodicTasks, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../../@core/configs/transloco-config';
import {Language} from '../../../@core/services/language';
import {CarouselImage} from '../../../entities/carousel-image';
import {ImageSlider} from './image-slider';

function image(id: number, overrides: Partial<CarouselImage> = {}): CarouselImage {
  return {
    id,
    name: 'Slide ' + id,
    nameRo: 'Slide RO ' + id,
    nameRu: 'Slide RU ' + id,
    imageUrl: `https://cdn.test/desktop-${id}.png`,
    sort: id,
    active: true,
    ...overrides,
  } as CarouselImage;
}

const IMAGES: CarouselImage[] = [
  image(1, {mobileImageUrl: 'https://cdn.test/mobile 1,a.png'}),
  image(2),
  image(3, {mobileImageUrl: 'https://cdn.test/mobile-3.png'}),
];

describe('ImageSlider', () => {
  let fixture: ComponentFixture<ImageSlider>;
  const currentLanguage = signal('ro');

  function render(images: CarouselImage[] = IMAGES): void {
    fixture.componentRef.setInput('images', images);
    // Auto slide would start a real interval; the tests switch slides by hand
    fixture.componentRef.setInput('autoSlide', false);
    fixture.detectChanges();
  }

  function slides(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.carousel-container .slide')) as HTMLElement[];
  }

  function slideImages(): HTMLImageElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('img.slide-img')) as HTMLImageElement[];
  }

  beforeEach(() => {
    currentLanguage.set('ro');
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({
          config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro'},
          loader: TranslocateHttpLoader,
        }),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: Language, useValue: {currentLanguage}},
      ],
    });
    fixture = TestBed.createComponent(ImageSlider);
  });

  afterEach(() => fixture.destroy());

  it('loads the first image eagerly with high fetch priority and the rest lazily', () => {
    render();
    const imgs = slideImages();
    expect(imgs.length).toBe(3);
    expect(imgs[0].getAttribute('loading')).toBe('eager');
    expect(imgs[0].getAttribute('fetchpriority')).toBe('high');
    for (const img of imgs.slice(1)) {
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.hasAttribute('fetchpriority')).toBeFalse();
    }
  });

  it('gives every image intrinsic dimensions of the desktop aspect ratio', () => {
    render();
    for (const img of slideImages()) {
      expect(img.getAttribute('width')).toBe('1536');
      expect(img.getAttribute('height')).toBe('672');
    }
  });

  it('lets the browser pick the mobile image through <source>, without JS', () => {
    render();
    const sources = Array.from(fixture.nativeElement.querySelectorAll('picture source')) as HTMLSourceElement[];
    // Slide 2 has no mobile image and therefore no <source>
    expect(sources.length).toBe(2);
    expect(sources[0].getAttribute('media')).toBe('(max-width: 768px)');
    expect(sources[0].getAttribute('srcset')).toBe('https://cdn.test/mobile%201%2Ca.png');
    expect(sources[0].getAttribute('width')).toBe('1080');
    expect(sources[0].getAttribute('height')).toBe('1440');
    expect(sources[1].getAttribute('srcset')).toBe('https://cdn.test/mobile-3.png');
  });

  it('sets desktop and mobile background images as CSS variables', () => {
    render();
    const bgs = Array.from(fixture.nativeElement.querySelectorAll('.slide-bg')) as HTMLElement[];
    expect(bgs[0].style.getPropertyValue('--bg')).toContain('desktop-1.png');
    expect(bgs[0].style.getPropertyValue('--bg-m')).toContain('mobile 1,a.png');
    // Without a mobile image the desktop one is used on mobile too
    expect(bgs[1].style.getPropertyValue('--bg-m')).toContain('desktop-2.png');
  });

  it('marks only the selected slide as active and moves the class on slide change', () => {
    render();
    const active = () => slides().map(s => s.classList.contains('image-active'));
    expect(active()).toEqual([true, false, false]);

    (fixture.nativeElement.querySelectorAll('.dot')[2] as HTMLElement).click();
    fixture.detectChanges();
    expect(active()).toEqual([false, false, true]);
  });

  it('keeps all slides in the DOM so switching never changes the carousel height', () => {
    render();
    expect(slides().length).toBe(3);
  });

  it('renders nothing when there are no hero items', () => {
    render([]);
    expect(fixture.nativeElement.querySelector('.carousel-container')).toBeNull();
  });

  it('exposes mobile overrides as CSS variables instead of reading the window width', () => {
    render([image(1, {
      titleFontSize: 42, mobileTitleFontSize: 24,
      titlePosition: 'bottom', mobileTitlePosition: 'center',
      overlayOffsetY: 145, mobileOverlayOffsetY: 60, overlayOffsetX: 80, mobileOverlayOffsetX: 20,
      badgeRo: 'Badge', badgePosition: 'top-right', mobileBadgePosition: 'bottom-left',
    })]);
    const title = fixture.nativeElement.querySelector('.slide-title') as HTMLElement;
    expect(title.style.getPropertyValue('--title-fs')).toBe('42px');
    expect(title.style.getPropertyValue('--title-fs-m')).toBe('24px');

    const overlay = fixture.nativeElement.querySelector('.slide-overlay') as HTMLElement;
    expect(overlay.classList).toContain('overlay-bottom');
    expect(overlay.classList).toContain('m-overlay-center');
    expect(overlay.style.getPropertyValue('--ov-bottom')).toBe('145px');
    expect(overlay.style.getPropertyValue('--ov-top-m')).toBe('50%');
    expect(overlay.style.getPropertyValue('--ov-px-m')).toBe('20px');

    const badge = fixture.nativeElement.querySelector('.slide-badge') as HTMLElement;
    expect(badge.classList).toContain('badge-top-right');
    expect(badge.classList).toContain('m-badge-bottom-left');
  });
  describe('auto slide', () => {
    function renderAuto(speed: number): void {
      fixture.componentRef.setInput('images', IMAGES);
      fixture.componentRef.setInput('autoSlideSpeed', speed);
      fixture.detectChanges();
    }

    it('does not keep the app unstable, so hydration can replay early clicks', async () => {
      renderAuto(50);
      const stable = await Promise.race([
        TestBed.inject(ApplicationRef).whenStable().then(() => true),
        new Promise<boolean>(resolve => setTimeout(() => resolve(false), 1000)),
      ]);
      expect(stable).toBeTrue();
    });

    it('still switches the active slide every autoSlideSpeed ms', fakeAsync(() => {
      renderAuto(1000);
      const active = () => slides().findIndex(s => s.classList.contains('image-active'));
      expect(active()).toBe(0);

      tick(1000);
      fixture.detectChanges();
      expect(active()).toBe(1);

      tick(2000);
      fixture.detectChanges();
      expect(active()).toBe(0);

      discardPeriodicTasks();
    }));
  });
});
