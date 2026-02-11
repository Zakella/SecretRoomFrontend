import {Component, inject} from '@angular/core';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-empty-state',
  imports: [],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
})
export class EmptyState {
 private langService = inject(Language);
 activeLang = this.langService.currentLanguage;
}
