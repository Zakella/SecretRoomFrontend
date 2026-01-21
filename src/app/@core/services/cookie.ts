import {computed, inject, Injectable, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class Cookie {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private _accepted = signal(this.isBrowser && localStorage.getItem('cookiesAccepted') === 'true');

  accepted = computed(() => this._accepted());

  acceptCookies() {
    this._accepted.set(true);
    if (this.isBrowser) {
      localStorage.setItem('cookiesAccepted', 'true');
    }
  }
}
