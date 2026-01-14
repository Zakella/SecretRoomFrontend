import { Component, inject } from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {DrawerModule} from 'primeng/drawer';
import {ButtonModule} from 'primeng/button';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'mobile-menu',
  imports: [
    RouterLink,
    DrawerModule,
    ButtonModule,
    NgForOf
  ],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss'
})
export class MobileMenu {
  public router = inject(Router);
  private langService = inject(Language)
  private cartService = inject(CartUi);

  public activeLang = this.langService.currentLanguage
  public cartCount =  this.cartService.cartCount;
  visible: boolean = false;
  categories = [
    { label: 'Skincare', icon: '/assets/icons/skincare.png' },
    { label: 'Make Up', icon: '/assets/icons/makeup.png' },
    { label: 'Perfumes', icon: '/assets/icons/perfume.png' },
    { label: 'Hair', icon: '/assets/icons/hair.png' },
    { label: 'Manicure & Pedicure', icon: '/assets/icons/nails.png' },
    { label: 'Hygiene', icon: '/assets/icons/hygiene.png' },
    { label: 'Accessories', icon: '/assets/icons/accessories.png' },
    { label: 'Devices', icon: '/assets/icons/devices.png' }
  ];


  openCart() {
    this.cartService.open();
  }


}
