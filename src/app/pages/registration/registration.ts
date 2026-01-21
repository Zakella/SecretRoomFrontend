import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {FormsModule} from "@angular/forms";
import {TranslocoPipe} from "@ngneat/transloco";
import {RegistrationService} from './services/registration';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-registration',
  imports: [
    FormsModule,
    TranslocoPipe,
    FadeUp
  ],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Registration {
  private registrationService = inject(RegistrationService);
  public registrationForm = this.registrationService.registrationForm;

  public onSubmit() {
  }
}
