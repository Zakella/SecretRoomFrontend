import { Component } from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive,
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {

  menuItems = [
    { label: 'Jewelry', submenu: ['Rings', 'Necklaces'], hover: false },
    { label: 'Watches', submenu: ['Men', 'Women'], hover: false },
    { label: 'Accessories', submenu: [], hover: false }
  ];


  setHover(index: number, value: boolean) {
    this.menuItems[index].hover = value;
  }

}
