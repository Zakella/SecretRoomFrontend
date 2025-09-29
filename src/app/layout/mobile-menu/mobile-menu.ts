import { Component, inject } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'app-mobile-menu',
  imports: [],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss'
})
export class MobileMenu {
  public router = inject(Router);
  navigateToFragment(fragment: string) {
    if (!fragment) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      const element = document.getElementById(fragment);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }

    history.replaceState(null, '', this.router.url.split('#')[0]);
  }
}
