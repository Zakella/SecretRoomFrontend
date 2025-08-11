import { Component } from '@angular/core';
import {Router, RouterLink} from '@angular/router';

@Component({
  selector: 'app-account-not-found',
  imports: [
    RouterLink
  ],
  templateUrl: './account-not-found.html',
  styleUrl: './account-not-found.scss'
})
export class AccountNotFound {

  constructor(private  router:Router) {
  }
  goHome() {
    const brand = this.router.url.includes('vs') ? 'vs' : 'bb';
    this.router.navigate([brand])

  }
}
