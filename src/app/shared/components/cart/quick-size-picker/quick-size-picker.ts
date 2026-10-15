import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, Injector,
  PLATFORM_ID, untracked
} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {QuickAddToCart} from '../services/quick-add-to-cart';
import {QuickAddOption} from '../services/quick-add-resolver';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';

/** Size picker for the quick "add to cart". Mounted once in the main layout. */
@Component({
  selector: 'app-quick-size-picker',
  imports: [TranslocoPipe, LocalizedNamePipe],
  templateUrl: './quick-size-picker.html',
  styleUrl: './quick-size-picker.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuickSizePicker {
  protected readonly state = inject(QuickAddToCart);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  private readonly doc = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private isOpen = false;
  /** Element that had focus when the panel opened (the "add to cart" button). */
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const pending = this.state.pending();
      untracked(() => {
        if (pending && !this.isOpen) {
          this.isOpen = true;
          this.opener = this.isBrowser ? this.doc.activeElement as HTMLElement | null : null;
        } else if (!pending && this.isOpen) {
          this.isOpen = false;
          this.restoreFocus();
        }
      });
      if (!pending) return;
      // First available size, or the close button when every size is sold out.
      afterNextRender(() => {
        const target = this.host.nativeElement.querySelector<HTMLElement>('.size-btn:not(:disabled)')
          ?? this.host.nativeElement.querySelector<HTMLElement>('.picker-close');
        target?.focus();
      }, {injector: this.injector});
    });
  }

  private restoreFocus(): void {
    const opener = this.opener;
    this.opener = null;
    if (!this.isBrowser || !opener) return;
    afterNextRender(() => {
      if (opener.isConnected) opener.focus();
    }, {injector: this.injector});
  }

  /** Keeps Tab / Shift+Tab inside the open panel. */
  @HostListener('document:keydown', ['$event'])
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab' || !this.state.pending()) return;
    const items = Array.from(
      this.host.nativeElement.querySelectorAll<HTMLElement>('.picker-close, .size-btn:not(:disabled)')
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = this.doc.activeElement;
    if (!active || !items.includes(active as HTMLElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  @HostListener('document:keydown.escape')
  protected onEscape(): void {
    if (this.state.pending()) {
      this.state.close();
    }
  }

  protected choose(option: QuickAddOption): void {
    this.state.choose(option);
  }

  protected close(): void {
    this.state.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
