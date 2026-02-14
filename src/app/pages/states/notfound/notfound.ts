import {ChangeDetectionStrategy, Component, inject, Optional, PLATFORM_ID} from '@angular/core';
import {RouterLink} from '@angular/router';
import {RESPONSE_INIT} from '@angular/core';
import {isPlatformServer} from '@angular/common';

@Component({
  selector: 'app-notfound',
  imports: [
    RouterLink
  ],
  templateUrl: './notfound.html',
  styleUrl: './notfound.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Notfound {
  constructor() {
    const platformId = inject(PLATFORM_ID);
    if (isPlatformServer(platformId)) {
      const response = inject(RESPONSE_INIT, {optional: true});
      if (response) {
        response.status = 404;
        response.statusText = 'Not Found';
      }
    }
  }
}
