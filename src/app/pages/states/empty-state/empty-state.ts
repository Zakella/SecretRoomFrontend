import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-empty-state',
  imports: [RouterLink],
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
 private langService = inject(Language);
 activeLang = this.langService.currentLanguage;
}
