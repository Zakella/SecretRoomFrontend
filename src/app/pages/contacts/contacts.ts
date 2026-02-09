import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {TranslocoPipe} from '@ngneat/transloco';
import {MetaService} from '../../@core/services/meta.service';

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

  stores = [
    {
      id: 1,
      name: 'Secret Room',
      location: 'Atrium, et. 2 , str. Albişoara 4, Chișinău, Moldova',
      imgUrl: 'https://cosmeticshop.md/content/userfiles/images/cosmetic%20shop%20store-min.webp',
      workTime:  '10:00 - 21:00',
      contact: '060099775',
      latitude: 47.015438488623985,
      longitude: 28.856022676715895,
      isNew: false
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
      isNew: true
    },
  ];

  ngOnInit() {
    this.metaService.updateTitle('Contacte | Secret Room');
    this.metaService.updateDescription('Contacte Secret Room: adresele magazinelor, numere de telefon și program de lucru.');
  }

  getGoogleMapsUrl(lat: number, lng: number): SafeResourceUrl {
    const url = `https://www.google.com/maps?q=${lat},${lng}&hl=ru&z=14&output=embed`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}
