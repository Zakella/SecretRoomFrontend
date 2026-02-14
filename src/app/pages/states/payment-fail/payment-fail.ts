import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {FadeUp} from '../../../@core/directives/fade-up';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-payment-fail',
  imports: [FadeUp, TranslocoPipe],
  templateUrl: './payment-fail.html',
  styleUrl: './payment-fail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentFail {
  private router = inject(Router);
  private langService = inject(Language);

  goBack() {
    this.router.navigate(['/', this.langService.currentLanguage(), 'checkout']);
  }
}
