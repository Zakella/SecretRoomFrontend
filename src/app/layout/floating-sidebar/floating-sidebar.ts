import { Component } from '@angular/core';

@Component({
  selector: 'app-floating-sidebar',
  imports: [],
  templateUrl: './floating-sidebar.html',
  styleUrl: './floating-sidebar.scss'
})
export class FloatingSidebar {
  cartCount = 1;
  hasGift = true; // или подставляй реальное значение из сервиса

}
