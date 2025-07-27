import { Component } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-payment-fail',
  imports: [],
  templateUrl: './payment-fail.html',
  styleUrl: './payment-fail.scss'
})
export class PaymentFail {
  constructor(public  router: Router) {
  }

  goBack() {
    this.router.navigate([`/checkout`]);
  }
}
