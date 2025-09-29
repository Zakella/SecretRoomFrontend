import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, Validators} from '@angular/forms';
import {TranslocoPipe} from '@ngneat/transloco';
import {RouterLink} from '@angular/router';
import {ResetPassword} from '../reset-password/reset-password';
import {NgIf} from '@angular/common';
import {Language} from '../../@core/services/language';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-login',
  imports: [
    ResetPassword,
    FormsModule,
    NgIf,
    TranslocoPipe,
    RouterLink,
    FadeUp
  ],
  templateUrl: './login.html',
  styleUrl: './login.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Login {
  showResetPassword = false;


  onResetPasswordSubmitted(event: any){

  }

  private langService = inject(Language);
  public activeLang = this.langService.currentLanguage


  showDialog() {
    this.showResetPassword = true;
  }
}
