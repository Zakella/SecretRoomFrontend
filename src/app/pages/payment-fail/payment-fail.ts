import {Component, inject} from '@angular/core';
import {Router} from '@angular/router';
import {FadeUp} from '../../@core/directives/fade-up';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-payment-fail',
  imports: [FadeUp, TranslocoPipe],
  templateUrl: './payment-fail.html',
  styleUrl: './payment-fail.scss'
})
export class PaymentFail {
  private router = inject(Router);

  goBack() {
    this.router.navigate([`/checkout`]);
  }
}
