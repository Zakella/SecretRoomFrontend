import {Component, EventEmitter, Input, Output} from '@angular/core';
import {FormsModule} from '@angular/forms';

@Component({
  selector: 'app-filter',
  imports: [FormsModule],
  templateUrl: './filter.html',
  styleUrl: './filter.scss'
})
export class Filter {
  @Input() filters: FilterGroup[] = [];
  @Input() selected: any = { category: [], type: [], brand: null };
  @Output() filterChanged = new EventEmitter<any>();
/*  @Input() filters: FilterGroup[] = [];
  @Output() filterChanged = new EventEmitter<{ group: string; value: string; checked: boolean }>();*/

  searchQuery = '';

  toggleGroup(group: FilterGroup) {
    group.collapsed = !group.collapsed;
  }

  onCheckboxChange(group: string, value: string, checked: boolean) {
    this.filterChanged.emit({ group, value, checked });
  }

}
export interface FilterGroup {
  title: string;
  type: 'checkbox' | 'search';
  collapsed?: boolean;
  values: { label: string; value: string; count?: number }[];
}
