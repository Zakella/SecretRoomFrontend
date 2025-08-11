import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ReturnPolicy} from '../../shared/components/return-policy/return-policy';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-footer',
  imports: [
    RouterLink,
    ReturnPolicy,
    TranslocoPipe
  ],
  templateUrl: './footer.html',
  styleUrl: './footer.scss'
})
export class Footer {
  isReturnPolicyVisible = false;
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage

  showPolicy() {
    this.isReturnPolicyVisible = true;
  }

}
