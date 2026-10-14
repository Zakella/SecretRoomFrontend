import {
  afterNextRender, ChangeDetectionStrategy, Component, effect, ElementRef, HostListener, inject, Injector
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

  constructor() {
    // Move focus to the first available size when the panel opens.
    effect(() => {
      if (!this.state.pending()) return;
      afterNextRender(() => {
        this.host.nativeElement.querySelector<HTMLButtonElement>('.size-btn:not(:disabled)')?.focus();
      }, {injector: this.injector});
    });
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
}
