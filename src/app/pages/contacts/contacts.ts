import {ChangeDetectionStrategy, Component} from '@angular/core';
import {DomSanitizer, SafeResourceUrl} from '@angular/platform-browser';
import {TranslocoService} from '@ngneat/transloco';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-contacts',
  imports: [
    FadeUp
  ],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Contacts {
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
