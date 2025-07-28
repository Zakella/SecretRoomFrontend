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
  stores = [
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
  }
}
