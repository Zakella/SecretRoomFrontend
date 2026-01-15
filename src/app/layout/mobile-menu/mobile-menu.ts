import {Component, inject, ViewEncapsulation} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {DrawerModule} from 'primeng/drawer';
import {ButtonModule} from 'primeng/button';
import {FormsModule} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'mobile-menu',
  imports: [
    RouterLink,
    DrawerModule,
    ButtonModule,
    FormsModule,
    TranslocoPipe
  ],
  templateUrl: './mobile-menu.html',
  styleUrl: './mobile-menu.scss',
  encapsulation: ViewEncapsulation.None
})
export class MobileMenu {
  public router = inject(Router);
  private langService = inject(Language)
  private cartService = inject(CartUi);

  public activeLang = this.langService.currentLanguage
  public cartCount =  this.cartService.cartCount;
  visible: boolean = false;
  categories = [
    { label: 'Skincare', icon: 'https://www.skincenterofsouthmiami.com/wp-content/uploads/2018/06/Skin-Center-of-South-Miami-Facials-and-Skin-Care.jpg' },
    { label: 'Make Up', icon: 'https://www.celinesbeautyrooms.ie/wp-content/uploads/2023/02/make-up.jpg' },
    { label: 'Perfumes', icon: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT0dBLgwZB1yZ0vMt05UuUDXZ8SIEODYpJArQ&s' },
    { label: 'Hair', icon: 'https://lovebeautyandplanet.in/cdn/shop/articles/Facts_abou_hair_growth_you_should_know_500.jpg?v=1708085249' },
    { label: 'Hygiene', icon: 'https://www.purifas.com/cdn/shop/articles/salon_hygiene_600x1000_58c72a6c-b672-473c-a9bc-13cbb46ff27d_1000x.png?v=1710804691' },
    { label: 'Accessories', icon: 'https://img.freepik.com/premium-photo/collection-fashion-accessories-like-sunglasses-watches-necklaces-white-background_1271419-10666.jpg?semt=ais_hybrid&w=740&q=80' },
  ];


  openCart() {
    this.cartService.open();
  }


}
