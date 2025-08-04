import {Component, inject} from '@angular/core';
import {Cookie} from '../../@core/services/cookie';

@Component({
  selector: 'app-cookie-banner',
  imports: [],
  templateUrl: './cookie-banner.html',
  styleUrl: './cookie-banner.scss'
})
export class CookieBanner {
  private cookieService = inject(Cookie);
  accepted = this.cookieService.accepted;

  accept() {
    this.cookieService.acceptCookies();
  }
}
