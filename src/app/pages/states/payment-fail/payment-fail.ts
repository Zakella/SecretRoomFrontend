import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-payment-fail',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './payment-fail.html',
  styleUrl: './payment-fail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PaymentFail {
  private router = inject(Router);
  private langService = inject(Language);

  activeLang = this.langService.currentLanguage;

  goToCheckout() {
    this.router.navigate(['/', this.langService.currentLanguage(), 'checkout']);
  }
}
