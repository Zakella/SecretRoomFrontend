import { Component } from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {TranslocoService} from '@ngneat/transloco';

@Component({
  selector: 'app-contacts',
  imports: [],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss'
})
export class Contacts {
/*  stores = [
    {
      id: 1,
      name: 'Victoria\'s Secret Room',
      location: 'Atrium, et. 2 , str. Albişoara 4, Chișinău, Moldova',
      description:  'descriptionMag1',
      work:  'workMag1',
      contact: '060099775',
      latitude: 47.015438488623985,
      longitude: 28.856022676715895,
      isNew: false
    },
    {
      id: 2,
      name: 'Victoria\'s Secret Room',
      location: 'str. Eminescu 56, Chișinău, Moldova',
      description:  'descriptionMag1',
      work:  'workMag2',
      contact: '060099775',
      latitude: 47.0211404,
      longitude: 28.8360804,
      isNew: true
    },
  ];

  constructor(private sanitizer: DomSanitizer,private translocoService: TranslocoService) {

  }
  getGoogleMapsUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${lat},${lng}&hl=ru&z=14&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }*/

  selectedCity: string = 'Все';

  cities = ['Все', 'Кишинёв', 'Бухарест', 'София'];

  stores: Store[] = [
    {
      city: 'Кишинёв',
      name: 'Chișinău - MallDova',
      address: 'Str. Arborilor 21, etaj 1',
      image: 'https://images.unsplash.com/photo-1508975550100-18b7e84f05d4',
      mapLink: 'https://goo.gl/maps/xxxx'
    },
    {
      city: 'Бухарест',
      name: 'Bucharest - Băneasa',
      address: 'Șoseaua București-Ploiești 42D',
      image: 'https://images.unsplash.com/photo-1563298723-dcfebaa392e3',
      mapLink: 'https://goo.gl/maps/yyyy'
    },
    {
      city: 'София',
      name: 'Sofia - Paradise Center',
      address: 'bul. "Cherni vrah" 100',
      image: 'https://images.unsplash.com/photo-1596554875098-bd5611dbf38d',
      mapLink: 'https://goo.gl/maps/zzzz'
    }
  ];

  get filteredStores(): Store[] {
    return this.selectedCity === 'Все'
      ? this.stores
      : this.stores.filter(store => store.city === this.selectedCity);
  }

}

interface Store {
  city: string;
  name: string;
  address: string;
  image: string;
  mapLink: string;
}
