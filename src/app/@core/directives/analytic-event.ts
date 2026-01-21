import {Directive, HostListener, inject, Input} from '@angular/core';
import {GoogleAnalytics} from '../services/google-analytics';

@Directive({
  selector: '[analyticEvent]'
})
export class AnalyticEvent {
  @Input() gaEvent!: string;
  @Input() gaCategory?: string;
  @Input() gaLabel?: string;
  @Input() gaValue?: number;

  private ga = inject(GoogleAnalytics);

  @HostListener('click')
  onClick() {
    if (!this.gaEvent) return;

    this.ga.send({
      event: this.gaEvent,
      category: this.gaCategory,
      label: this.gaLabel,
      value: this.gaValue
    });
  }

}
