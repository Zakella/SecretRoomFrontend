import {Component, inject} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';

@Component({
  selector: 'app-header',
  imports: [
    RouterLink,
    RouterLinkActive
  ],
  templateUrl: './header.html',
  styleUrl: './header.scss'
})
export class Header {
  private cartService = inject(CartUi);
  private langService = inject(Language);
  protected readonly Object = Object;
  public activeLang = this.langService.currentLanguage
  public activeMenu: string | null = null;
  public languages = ['ru', 'ro'];
  dropdownContent: Record<string, any> = {
    NEW: {
      title: 'New Arrivals',
      description: 'Свежие поступления, которых вы ждали.',
      categories: ['Just In', 'Editor\'s Picks', 'Trending'],
      image: {
        url: 'https://images.unsplash.com/photo-1612197529596-77059a16b911',
        caption: 'Новинки на каждый день'
      }
    },
    SUMMER: {
      title: 'Summer Favorites',
      description: 'Лучшие товары для солнечных дней.',
      categories: ['Sunscreens', 'Glow Kits', 'Cooling Mists'],
      image: {
        url: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde',
        caption: 'Летняя коллекция'
      }
    },
    SKINCARE: {
      title: 'Skincare Essentials',
      description: 'Очищение, увлажнение и сияние кожи.',
      categories: ['Cleansers', 'Toners', 'Serums', 'Moisturizers'],
      image: {
        url: 'https://images.unsplash.com/photo-1625513362437-5b82a3e0a4e3',
        caption: 'Уход за кожей'
      }
    },
    MAKEUP: {
      title: 'Makeup Must-Haves',
      description: 'Вырази себя с идеальным макияжем.',
      categories: ['Foundation', 'Lipstick', 'Mascara', 'Palettes'],
      image: {
        url: 'https://images.unsplash.com/photo-1556229010-aa3bdf1f58e9',
        caption: 'Твоя косметичка'
      }
    },
    BODY: {
      title: 'Body Care',
      description: 'Забота о теле с головы до пят.',
      categories: ['Scrubs', 'Body Oils', 'Lotions', 'Deodorants'],
      image: {
        url: 'https://images.unsplash.com/photo-1588776814546-1c5292b1806d',
        caption: 'Мягкость и свежесть'
      }
    },
  };


  public openCart() {
    this.cartService.open();
  }

  public showDropdown(menu: string) {
    this.activeMenu = menu;
  }

  public hideDropdown() {
    this.activeMenu = null;
  }

  public setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }
}
