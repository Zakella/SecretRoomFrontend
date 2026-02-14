import {ChangeDetectionStrategy, Component, inject, OnInit, signal} from '@angular/core';
import {ReactiveFormsModule} from '@angular/forms';
import {Meta} from '@angular/platform-browser';
import {TranslocoPipe} from '@ngneat/transloco';
import {RegistrationService} from './services/registration';
import {Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-registration',
  imports: [
    ReactiveFormsModule,
    TranslocoPipe,
    RouterLink
  ],
  templateUrl: './registration.html',
  styleUrl: './registration.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Registration implements OnInit {
  private meta = inject(Meta);
  registrationService = inject(RegistrationService);
  private langService = inject(Language);
  private router = inject(Router);

  registrationForm = this.registrationService.registrationForm;
  activeLang = this.langService.currentLanguage;

  showPassword = false;
  isSubmitting = signal(false);

  ngOnInit() {
    this.meta.updateTag({name: 'robots', content: 'noindex, nofollow'});
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  hasValue(fieldName: string): boolean {
    const field = this.registrationForm.get(fieldName);
    return !!(field && field.value && field.value.length > 0);
  }

  onSubmit(): void {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.registrationService.onSubmit(this.registrationForm.value);

    // Reset submitting state after a delay (in real app, this would be in the service callback)
    setTimeout(() => this.isSubmitting.set(false), 2000);
  }

  switchLang(lang: 'ro' | 'ru') {
    this.langService.setLanguage(lang);
    this.router.navigate(['/', lang, 'registration']);
  }
}
