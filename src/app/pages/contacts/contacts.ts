import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';
import {Store} from '../../entities/store';
import {STORES} from '../../mock/stores';

@Component({
  selector: 'contacts',
  imports: [FadeUp],
  templateUrl: './contacts.html',
  styleUrl: './contacts.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Contacts {
  selectedCity: string = 'Все';
  cities = ['Все', 'Кишинёв', 'Бухарест', 'София'];
  stores: Store[] = STORES;

  get filteredStores(): Store[] {
    return this.selectedCity === 'Все'
      ? this.stores
      : this.stores.filter(store => store.city === this.selectedCity);
  }
}
