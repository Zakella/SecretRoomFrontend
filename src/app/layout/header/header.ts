import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {CartUi} from '../../shared/components/cart/services/cart';
import {TranslocoPipe} from '@ngneat/transloco';
import {Select} from 'primeng/select';

@Component({
  selector: 'app-header',
  imports: [RouterLink, TranslocoPipe, Select],
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
        url: 'https://plus.unsplash.com/premium_photo-1683120952553-af3ec9cd60c0?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        caption: 'Новинки на каждый день'
      }
    },
    SUMMER: {
      title: 'Summer Favorites',
      description: 'Лучшие товары для солнечных дней.',
      categories: ['Sunscreens', 'Glow Kits', 'Cooling Mists'],
      image: {
        url: '/assets/images/demo/slider1.jpeg',
        caption: 'Летняя коллекция'
      }
    },
    SKINCARE: {
      title: 'Skincare Essentials',
      description: 'Очищение, увлажнение и сияние кожи.',
      categories: ['Cleansers', 'Toners', 'Serums', 'Moisturizers'],
      image: {
        url: 'assets/images/demo/slider1.jpeg',
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
