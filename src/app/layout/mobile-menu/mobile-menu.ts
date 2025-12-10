import { Component, inject } from '@angular/core';
import {Router} from '@angular/router';

@Component({
  selector: 'mobile-menu',
  imports: [],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss'
})
export class MobileMenu {
  public router = inject(Router);
}
