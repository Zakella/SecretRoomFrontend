import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {
  afterNextRender, ChangeDetectionStrategy, Component, computed, effect, ElementRef, HostListener, inject, Injector,
  PLATFORM_ID, signal, untracked
} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {QuickAddToCart} from '../services/quick-add-to-cart';
import {QuickAddOption} from '../services/quick-add-resolver';
import {LocalizedNamePipe} from '../../../pipes/localized-name.pipe';
import {Language} from '../../../../@core/services/language';
import {holdProductId, holdRequestFor, StoreHoldState} from '../../../../widgets/store-hold/store-hold-state';

/** Focusable controls of the panel, in DOM order (focus trap). */
const FOCUSABLE = '.picker-close, .size-btn:not(:disabled), .hold-toggle';

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
  private readonly holdState = inject(StoreHoldState);
  private readonly lang = inject(Language).currentLanguage;
  private isOpen = false;
  /** The panel hands over to the hold dialog: focus goes there, not back to the opener. */
  private handedOver = false;
  /** SR-223: picking a size opens the store hold dialog instead of adding to the cart. */
  protected readonly holdMode = signal(false);
  /** Hold is offered while it is switched on, the card is on sale and some size can be held. */
  protected readonly canHold = computed(() => {
    const pending = this.state.pending();
    if (!pending || this.holdState.disabled() || pending.product.discontinued) return false;
    return !!holdProductId(pending.product) && pending.options.some(o => this.holdable(o));
  });
  /** Element that had focus when the panel opened (the "add to cart" button). */
  private opener: HTMLElement | null = null;

  constructor() {
    effect(() => {
      const pending = this.state.pending();
      untracked(() => {
        if (pending && !this.isOpen) {
          this.isOpen = true;
          this.holdMode.set(false);
          this.opener = this.isBrowser ? this.doc.activeElement as HTMLElement | null : null;
        } else if (!pending && this.isOpen) {
          this.isOpen = false;
          this.holdMode.set(false);
          if (this.handedOver) {
            this.handedOver = false;
            this.opener = null;
          } else {
            this.restoreFocus();
          }
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
      this.host.nativeElement.querySelectorAll<HTMLElement>(FOCUSABLE)
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
    if (this.holdMode()) {
      this.hold(option);
      return;
    }
    this.state.choose(option);
  }

  /** A size can be held when it is in stock and identified by its variant (legacy sizes are not). */
  protected holdable(option: QuickAddOption): boolean {
    return option.available && option.variantAppId != null;
  }

  protected toggleHold(): void {
    this.holdMode.update(on => !on);
  }

  /** Closes the panel first: the dialog would otherwise open under the mobile bottom sheet. */
  private hold(option: QuickAddOption): void {
    const pending = this.state.pending();
    if (!pending || !this.holdable(option)) return;
    const variant = pending.product.variants?.find(v => v.appId === option.variantAppId);
    const request = holdRequestFor(pending.product, this.lang(), option.variantAppId ?? null, option.size, variant?.price);
    if (!request) return;
    this.handedOver = true;
    this.state.close();
    this.holdState.open(request);
  }

  protected close(): void {
    this.state.close();
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }
}
