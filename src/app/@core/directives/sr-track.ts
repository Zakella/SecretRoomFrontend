import {Directive, HostListener, inject, input} from '@angular/core';
import {SiteTracker, TrackButton} from '../api/site-tracker';

/** SR-207: `srTrack="ADD_TO_CART"` on a main button/link records one CLICK in the visitor journal. */
// eslint-disable-next-line @angular-eslint/directive-selector -- name fixed by the SR-207 contract
@Directive({selector: '[srTrack]'})
export class SrTrack {
  readonly srTrack = input<TrackButton | ''>('');
  private tracker = inject(SiteTracker);

  @HostListener('click')
  onClick(): void {
    this.tracker.click(this.srTrack());
  }
}
