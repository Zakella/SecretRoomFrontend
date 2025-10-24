import {ChangeDetectionStrategy, Component, inject, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';
import {RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {FadeUp} from '../../@core/directives/fade-up';
import {ResetPassword} from '../../shared/components/modals/reset-password/reset-password';

@Component({
  selector: 'app-login',
  imports: [
    ResetPassword,
    FormsModule,
    TranslocoPipe,
    RouterLink,
    FadeUp
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  protected showResetPassword = signal<boolean>(false)
  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage


  onResetPasswordSubmitted(event: any) {}


  showDialog() {
    this.showResetPassword.set(true);
  }
}
