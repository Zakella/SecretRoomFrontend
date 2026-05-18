import {ChangeDetectionStrategy, Component, HostListener, inject, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {isPlatformBrowser} from '@angular/common';
import {FadeUp} from '../../@core/directives/fade-up';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {TranslocoPipe} from '@ngneat/transloco';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';

interface StorePhoto {
  desktop: string;
  desktopWebp?: string;
  mobile?: string;
  mobileWebp?: string;
  landscape?: boolean;
}

interface Store {
  id: number;
  name: string;
  location: string;
  imgUrl: string;
  workTime: string;
  contact: string;
  latitude: number;
  longitude: number;
  isNew: boolean;
  photos: StorePhoto[];
}

@Component({
  selector: 'contacts',
  imports: [FadeUp, TranslocoPipe],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Contacts implements OnInit {
  private metaService = inject(MetaService);
  private sanitizer = inject(DomSanitizer);
  private langService = inject(Language);
  private platformId = inject(PLATFORM_ID);

  stores: Store[] = [
    {
      id: 1,
      name: 'Secret Room',
      location: 'Atrium, et. 1 , but. 1029, str. Albişoara 4, Chișinău, Moldova',
      imgUrl: 'https://cosmeticshop.md/content/userfiles/images/cosmetic%20shop%20store-min.webp',
      workTime:  '10:00 - 21:00',
      contact: '060099775',
      latitude: 47.015438488623985,
      longitude: 28.856022676715895,
      isNew: false,
      photos: [
        {
          desktop: '/stores/atrium/atrium-collage-desktop.jpg',
          desktopWebp: '/stores/atrium/atrium-collage-desktop.webp',
          mobile: '/stores/atrium/atrium-collage-mobile.jpg',
          mobileWebp: '/stores/atrium/atrium-collage-mobile.webp',
          landscape: true,
        }
      ]
    },
    {
      id: 2,
      name: 'Secret Room',
      imgUrl: 'https://cosmeticshop.md/content/userfiles/images/cosmetic%20shop%20store-min.webp',
      location: 'str. Eminescu 56, Chișinău, Moldova',
      workTime:  '10:00 - 21:00',
      contact: '060099775',
      latitude: 47.0211404,
      longitude: 28.8360804,
      isNew: true,
      photos: [
        { desktop: '/stores/eminescu/1.jpeg' }
      ]
    },
  ];

  activePhotos = signal<StorePhoto[]>([]);
  activeIndex = signal(0);
  isLightboxOpen = signal(false);

  ngOnInit() {
    const isRo = this.langService.currentLanguage() === 'ro';
    this.metaService.updateTitle(isRo
      ? 'Contacte | Secret Room'
      : 'Контакты | Secret Room');
    this.metaService.updateDescription(isRo
      ? 'Contacte Secret Room: adresele magazinelor, numere de telefon și program de lucru.'
      : 'Контакты Secret Room: адреса магазинов, номера телефонов и график работы.');
    this.metaService.updateKeywords(isRo
      ? 'Secret Room contacte, adresa magazin, Chișinău, program de lucru, telefon, Victoria\'s Secret Moldova'
      : 'Secret Room контакты, адрес магазина, Кишинёв, график работы, телефон, Victoria\'s Secret Молдова');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');

    for (const store of this.stores) {
      this.metaService.setJsonLd({
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        'name': store.name,
        'image': store.imgUrl,
        'address': {
          '@type': 'PostalAddress',
          'streetAddress': store.location.split(',')[0],
          'addressLocality': 'Chișinău',
          'addressCountry': 'MD'
        },
        'geo': {
          '@type': 'GeoCoordinates',
          'latitude': store.latitude,
          'longitude': store.longitude
        },
        'openingHours': 'Mo-Su ' + store.workTime,
        'url': 'https://secretroom.md',
        'priceRange': '$$'
      }, `local-business-${store.id}`);
    }
  }

  getGoogleMapsUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${lat},${lng}&hl=ru&z=14&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  openLightbox(photos: StorePhoto[], index: number) {
    this.activePhotos.set(photos);
    this.activeIndex.set(index);
    this.isLightboxOpen.set(true);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeLightbox() {
    this.isLightboxOpen.set(false);
    if (isPlatformBrowser(this.platformId)) {
      document.body.style.overflow = '';
    }
  }

  nextPhoto(event?: Event) {
    event?.stopPropagation();
    const photos = this.activePhotos();
    if (photos.length <= 1) return;
    this.activeIndex.set((this.activeIndex() + 1) % photos.length);
  }

  prevPhoto(event?: Event) {
    event?.stopPropagation();
    const photos = this.activePhotos();
    if (photos.length <= 1) return;
    this.activeIndex.set((this.activeIndex() - 1 + photos.length) % photos.length);
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(event: KeyboardEvent) {
    if (!this.isLightboxOpen()) return;
    if (event.key === 'Escape') this.closeLightbox();
    else if (event.key === 'ArrowRight') this.nextPhoto();
    else if (event.key === 'ArrowLeft') this.prevPhoto();
  }
}
