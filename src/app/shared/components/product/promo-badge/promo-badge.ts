import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {PromoLabel} from '../../../pipes/promo-label.pipe';

/**
 * SR-240: promotion badge of a product card (same look as `.badge-sale` of the catalog card).
 * It does not position itself: the host is placed by the card that uses it.
 */
@Component({
  selector: 'promo-badge',
  imports: [TranslocoPipe],
  templateUrl: './promo-badge.html',
  styleUrl: './promo-badge.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PromoBadge {
  readonly label = input.required<PromoLabel>();
}
