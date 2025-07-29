import {Component, inject} from '@angular/core';
import {RouterLink, RouterLinkActive} from '@angular/router';
import {Language} from '../../@core/services/language';

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
  /*public languages = ['ru', 'ro'];
  private langService = inject(Language);
  public  activeLang = this.langService.currentLanguage
  activeDropdown: NavItem | null = null;

  setActiveLang(lang: string) {
    this.langService.setLanguage(lang);
  }
  activeMenu: string | null = null;



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
    // ... добавь другие секции по желанию
  };



/!*
  navItems: NavItem[] = [
    { label: 'NEW', link: '/new' },
    { label: 'SUMMER', link: '/summer' },
    { label: 'DETOX NOTES', dropdown: [
        {
          title: 'Secret Room',
          description: 'Кураторская коллекция. Только подзоверенная формула.',
        },
        {
          title: 'SHOP BY',
          items: [
            { label: "What's New", link: '/shop/new' },
            { label: 'Best Sellers', link: '/shop/best' }
          ]
        },
        {
          title: 'PRODUCT TYPE',
          items: [
            { label: 'Bath & Shower', link: '/body/bath' },
            { label: 'Tools', link: '/body/tools' }
          ]
        },
        {
          image: 'https://t4.ftcdn.net/jpg/02/73/55/33/360_F_273553300_sBBxIPpLSn5iC5vC8FwzFh6BJDKvUeaC.jpg',
          description: 'Abel Fragrance | 100% Natural Ingredients'
        }
      ]
    }
  ];
*!/


  showDetoxNotes: boolean = false;

  showDropdown() {
    this.showDetoxNotes = true;
  }

  hideDropdown() {
    this.showDetoxNotes = false;
  }

  protected readonly Object = Object;*/
  activeMenu: string | null = null;

  languages = ['en', 'ru', 'ro'];
  activeLang = () => 'en';

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

  showDropdown(menu: string) {
    this.activeMenu = menu;
  }

  hideDropdown() {
    this.activeMenu = null;
  }

  setActiveLang(lang: string) {
    // логика выбора языка
  }

  protected readonly Object = Object;
}



export interface NavItem {
  label: string;
  link?: string;
  dropdown?: DropdownSection[];
}

export interface DropdownSection {
  title?: string;
  items?: { label: string; link: string }[];
  image?: string;
  description?: string;
}
