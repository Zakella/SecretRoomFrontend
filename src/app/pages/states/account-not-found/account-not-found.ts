import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {Router, RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../../@core/services/language';

@Component({
  selector: 'app-account-not-found',
  imports: [RouterLink, TranslocoPipe],
  templateUrl: './account-not-found.html',
  styleUrl: './account-not-found.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AccountNotFound {
  private router = inject(Router);
  protected langService = inject(Language);
  protected activeLang = this.langService.currentLanguage;

  goHome() {
    this.router.navigate(['/', this.activeLang()]);
  }
}
