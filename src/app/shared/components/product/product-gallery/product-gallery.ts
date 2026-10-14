import {
  ChangeDetectionStrategy, Component, DestroyRef, ElementRef, PLATFORM_ID, afterNextRender, afterRenderEffect, computed, effect,
  inject, input, signal, untracked, viewChild,
} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {TranslocoPipe} from '@ngneat/transloco';
import {ProductImage} from '../../../../entities/product-image';

export const UNAVAILABLE_IMAGE = 'assets/images/no-image.png';

interface GallerySlide {
  url: string;
  alt: string;
  originalIndex: number;
  clone: boolean;
  key: string;
}

interface Point {
  x: number;
  y: number;
}

/**
 * Галерея фото товара: лента со scroll-snap и бесконечной прокруткой (клоны по краям),
 * свайп, стрелки, клавиши ←/→, миниатюры и полноэкранный просмотр с pinch-zoom.
 * Всё, что трогает DOM/scroll/dialog, выполняется только в браузере.
 */
@Component({
  selector: 'product-gallery',
  imports: [TranslocoPipe],
  templateUrl: './product-gallery.html',
  styleUrl: './product-gallery.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGallery {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly destroyRef = inject(DestroyRef);

  readonly images = input<readonly ProductImage[]>([]);
  readonly alt = input<string>('');

  private readonly mainTrack = viewChild<ElementRef<HTMLElement>>('mainTrack');
  private readonly zoomTrack = viewChild<ElementRef<HTMLElement>>('zoomTrack');
  private readonly zoomDialog = viewChild<ElementRef<HTMLDialogElement>>('zoomDialog');

  readonly selectedIndex = signal(0);
  readonly zoomOpen = signal(false);
  readonly zoomScale = signal(1);
  readonly zoomOffsetX = signal(0);
  readonly zoomOffsetY = signal(0);
  readonly isZoomed = computed(() => this.zoomScale() > 1.01);

  readonly items = computed(() => {
    const alt = this.alt();
    return this.images().map((image, index) => ({
      url: image.imageUrl || UNAVAILABLE_IMAGE,
      alt: index === 0 ? alt : `${alt} - ${index + 1}`,
    }));
  });
  readonly count = computed(() => this.items().length);
  readonly multiple = computed(() => this.count() > 1);

  /** Клоны по краям добавляются только в браузере после первой отрисовки: SSR и первый кадр совпадают (первое фото на scrollLeft=0). */
  readonly clonesReady = signal(false);
  private readonly hasClones = computed(() => this.clonesReady() && this.count() > 1);

  readonly slides = computed<GallerySlide[]>(() => {
    const items = this.items();
    const make = (i: number, clone: boolean, tag: string): GallerySlide => ({
      url: items[i].url, alt: items[i].alt, originalIndex: i, clone, key: `${tag}-${i}-${items[i].url}`,
    });
    if (!this.hasClones()) {
      return items.map((_, i) => make(i, false, 'single'));
    }
    const last = items.length - 1;
    return [make(last, true, 'clone-start'), ...items.map((_, i) => make(i, false, 'real')), make(0, true, 'clone-end')];
  });

  private animationFrames = new WeakMap<HTMLElement, number>();
  private scrollFrame: number | null = null;
  private zoomScrollFrame: number | null = null;
  private zoomPointers = new Map<number, Point>();
  private pinchStartDistance = 0;
  private pinchStartScale = 1;
  private gestureStartCenter: Point = {x: 0, y: 0};
  private gestureStartOffset: Point = {x: 0, y: 0};
  private lastPanPoint: Point | null = null;

  constructor() {
    // Смена списка (другой товар/вариант): на первое фото, без анимации.
    effect(() => {
      this.images();
      untracked(() => {
        this.selectedIndex.set(0);
        this.resetZoom();
        this.zoomOpen.set(false);
      });
    });

    effect(() => {
      const open = this.zoomOpen();
      const dialog = this.zoomDialog()?.nativeElement;
      if (!this.isBrowser || !dialog) return;
      if (open && !dialog.open && typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else if (!open && dialog.open) {
        dialog.close();
      }
    });

    if (this.isBrowser) afterNextRender(() => this.clonesReady.set(true));

    // После отрисовки (до paint) ставим ленты на текущий слайд без анимации: при смене слайдов/лент
    // (другой товар, появление клонов, открытие лайтбокса). Текущий индекс читаем без подписки.
    afterRenderEffect({
      write: () => {
        this.slides();
        const main = this.mainTrack()?.nativeElement;
        const zoom = this.zoomTrack()?.nativeElement;
        untracked(() => {
          const virtual = this.virtualIndex(this.selectedIndex());
          if (main) this.jumpTo(main, virtual);
          if (zoom) this.jumpTo(zoom, virtual);
        });
      },
    });

    this.destroyRef.onDestroy(() => {
      if (!this.isBrowser) return;
      if (this.scrollFrame !== null) cancelAnimationFrame(this.scrollFrame);
      if (this.zoomScrollFrame !== null) cancelAnimationFrame(this.zoomScrollFrame);
    });
  }

  // ===== Индекс (чистая логика, без scroll) =====

  select(index: number): void {
    if (index < 0 || index >= this.count()) return;
    this.resetZoom();
    this.selectedIndex.set(index);
    this.scrollTracksTo(this.virtualIndex(index));
  }

  next(): void {
    this.move(1);
  }

  prev(): void {
    this.move(-1);
  }

  private move(step: number): void {
    const length = this.count();
    if (length < 2) return;
    const selected = this.selectedIndex();
    this.resetZoom();
    this.selectedIndex.set((selected + step + length) % length);
    // Через край — едем на клон, после остановки лента незаметно перепрыгнет на настоящий слайд.
    // Пока клонов нет — обычное зацикливание на настоящий слайд.
    if (!this.hasClones()) return this.scrollTracksTo(this.selectedIndex());
    if (step > 0 && selected === length - 1) return this.scrollTracksTo(length + 1);
    if (step < 0 && selected === 0) return this.scrollTracksTo(0);
    this.scrollTracksTo(this.virtualIndex(this.selectedIndex()));
  }

  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.prev();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.next();
    }
  }

  // ===== Разметка =====

  /** Файл фото не отдался (404 на serveFile) — заглушка вместо сломанной картинки. */
  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    if (!img.src.endsWith(UNAVAILABLE_IMAGE)) img.src = UNAVAILABLE_IMAGE;
  }

  isEager(slide: GallerySlide): boolean {
    return !slide.clone && slide.originalIndex === 0;
  }

  openZoom(): void {
    if (!this.isBrowser || this.count() === 0) return;
    this.resetZoom();
    this.zoomOpen.set(true);
  }

  closeZoom(): void {
    this.zoomOpen.set(false);
  }

  onLightboxClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeZoom();
  }

  // ===== Скролл-ленты (только браузер) =====

  onMainScroll(track: HTMLElement): void {
    if (!this.isBrowser || this.scrollFrame !== null) return;
    this.scrollFrame = requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.syncFromTrack(track);
    });
  }

  onZoomScroll(track: HTMLElement): void {
    if (!this.isBrowser || this.isZoomed() || this.zoomScrollFrame !== null) return;
    this.zoomScrollFrame = requestAnimationFrame(() => {
      this.zoomScrollFrame = null;
      const index = this.syncFromTrack(track);
      const main = this.mainTrack()?.nativeElement;
      if (main) this.jumpTo(main, this.virtualIndex(index));
    });
  }

  private virtualIndex(index: number): number {
    return this.hasClones() ? index + 1 : index;
  }

  private originalIndex(virtual: number, length: number): number {
    if (length < 2) return 0;
    if (!this.hasClones()) return this.clamp(virtual, 0, length - 1);
    if (virtual <= 0) return length - 1;
    if (virtual >= length + 1) return 0;
    return virtual - 1;
  }

  private scrollTracksTo(virtual: number): void {
    if (!this.isBrowser) return;
    for (const track of [this.mainTrack()?.nativeElement, this.zoomTrack()?.nativeElement]) {
      if (track) this.animateTo(track, virtual);
    }
  }

  private animateTo(track: HTMLElement, index: number): void {
    const target = index * track.clientWidth;
    const start = track.scrollLeft;
    const distance = target - start;
    if (Math.abs(distance) < 1) return;

    const existing = this.animationFrames.get(track);
    if (existing !== undefined) cancelAnimationFrame(existing);

    const duration = 160;
    const startTime = performance.now();
    const step = (time: number) => {
      const progress = Math.min((time - startTime) / duration, 1);
      track.scrollLeft = start + distance * (1 - Math.pow(1 - progress, 3));
      if (progress < 1) {
        this.animationFrames.set(track, requestAnimationFrame(step));
        return;
      }
      this.animationFrames.delete(track);
      track.scrollLeft = target;
    };
    this.animationFrames.set(track, requestAnimationFrame(step));
  }

  private jumpTo(track: HTMLElement, virtual: number): void {
    const existing = this.animationFrames.get(track);
    if (existing !== undefined) {
      cancelAnimationFrame(existing);
      this.animationFrames.delete(track);
    }
    track.scrollLeft = virtual * track.clientWidth;
  }

  private syncFromTrack(track: HTMLElement): number {
    const length = this.count();
    const width = track.clientWidth;
    if (width <= 0 || length === 0) return this.selectedIndex();

    const virtual = Math.round(track.scrollLeft / width);
    const index = this.originalIndex(virtual, length);
    if (index !== this.selectedIndex()) {
      this.resetZoom();
      this.selectedIndex.set(index);
    }
    if (this.hasClones() && virtual <= 0) this.jumpTo(track, length);
    else if (this.hasClones() && virtual >= length + 1) this.jumpTo(track, 1);
    return index;
  }

  // ===== Zoom: pinch / pan / двойной клик =====

  zoomTransform(slide: GallerySlide): string {
    if (slide.originalIndex !== this.selectedIndex()) return 'translate3d(0, 0, 0) scale(1)';
    return `translate3d(${this.zoomOffsetX()}px, ${this.zoomOffsetY()}px, 0) scale(${this.zoomScale()})`;
  }

  onZoomPointerDown(event: PointerEvent): void {
    if (!this.zoomOpen()) return;
    this.zoomPointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (this.zoomPointers.size >= 2) {
      event.preventDefault();
      this.startPinch();
    } else if (this.isZoomed()) {
      event.preventDefault();
      this.lastPanPoint = {x: event.clientX, y: event.clientY};
    }
  }

  onZoomPointerMove(event: PointerEvent): void {
    if (!this.zoomPointers.has(event.pointerId)) return;
    this.zoomPointers.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (this.zoomPointers.size >= 2) {
      event.preventDefault();
      this.updatePinch();
    } else if (this.isZoomed() && this.lastPanPoint) {
      event.preventDefault();
      this.setOffset(
        this.zoomOffsetX() + event.clientX - this.lastPanPoint.x,
        this.zoomOffsetY() + event.clientY - this.lastPanPoint.y,
        this.zoomScale(),
      );
      this.lastPanPoint = {x: event.clientX, y: event.clientY};
    }
  }

  onZoomPointerUp(event: PointerEvent): void {
    if (!this.zoomPointers.has(event.pointerId)) return;
    this.zoomPointers.delete(event.pointerId);
    this.pinchStartDistance = 0;
    this.lastPanPoint = this.zoomPointers.size === 1 && this.isZoomed() ? [...this.zoomPointers.values()][0] : null;
  }

  onZoomDoubleClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.isZoomed()) {
      this.resetZoom();
      return;
    }
    this.zoomScale.set(2.5);
    this.setOffset(0, 0, 2.5);
  }

  private startPinch(): void {
    const [a, b] = [...this.zoomPointers.values()];
    if (!a || !b) return;
    this.pinchStartDistance = Math.hypot(a.x - b.x, a.y - b.y);
    this.pinchStartScale = this.zoomScale();
    this.gestureStartCenter = {x: (a.x + b.x) / 2, y: (a.y + b.y) / 2};
    this.gestureStartOffset = {x: this.zoomOffsetX(), y: this.zoomOffsetY()};
    this.lastPanPoint = null;
  }

  private updatePinch(): void {
    const [a, b] = [...this.zoomPointers.values()];
    if (!a || !b) return;
    if (this.pinchStartDistance <= 0) return this.startPinch();

    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    const centerX = (a.x + b.x) / 2;
    const centerY = (a.y + b.y) / 2;
    const scale = this.clamp(this.pinchStartScale * (distance / this.pinchStartDistance), 1, 4);
    if (scale <= 1.01) {
      this.zoomScale.set(1);
      this.setOffset(0, 0, 1);
      return;
    }
    this.zoomScale.set(scale);
    this.setOffset(
      this.gestureStartOffset.x + centerX - this.gestureStartCenter.x,
      this.gestureStartOffset.y + centerY - this.gestureStartCenter.y,
      scale,
    );
  }

  private resetZoom(): void {
    this.zoomScale.set(1);
    this.zoomOffsetX.set(0);
    this.zoomOffsetY.set(0);
    this.zoomPointers.clear();
    this.pinchStartDistance = 0;
    this.lastPanPoint = null;
  }

  private setOffset(x: number, y: number, scale: number): void {
    if (scale <= 1.01) {
      this.zoomOffsetX.set(0);
      this.zoomOffsetY.set(0);
      return;
    }
    const track = this.zoomTrack()?.nativeElement;
    const width = track?.clientWidth || window.innerWidth;
    const height = track?.clientHeight || window.innerHeight;
    const maxX = (width * (scale - 1)) / 2;
    const maxY = (height * (scale - 1)) / 2;
    this.zoomOffsetX.set(this.clamp(x, -maxX, maxX));
    this.zoomOffsetY.set(this.clamp(y, -maxY, maxY));
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
  }
}
