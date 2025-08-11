import {Component, inject} from '@angular/core';
import {FormBuilder, FormGroup, FormsModule, ValidatorFn, Validators} from "@angular/forms";
import {TranslocoPipe, TranslocoService} from "@ngneat/transloco";
import {Language} from '../../@core/services/language';
import {Authentication} from '../../@core/auth/authentication';
import {Router, RouterLink} from '@angular/router';
import {User} from '../../@core/api/user';
import {RegistrationService} from './services/registration';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-registration',
  imports: [
    FormsModule,
    TranslocoPipe,
    RouterLink,
    FadeUp
  ],
  templateUrl: './registration.html',
  styleUrl: './registration.scss'
})
export class Registration {
 private registrationService = inject(RegistrationService);
 public registrationForm = this.registrationService.registrationForm;

 public onSubmit(){

  }
}
