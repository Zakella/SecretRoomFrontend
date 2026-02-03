import { Injectable } from '@angular/core';
import { of } from 'rxjs';
import {Translation, TranslocoLoader} from '@ngneat/transloco';
import ro from '../../../assets/i18n/ro.json';
import ru from '../../../assets/i18n/ru.json';

@Injectable({ providedIn: 'root' })
export class TranslocateHttpLoader implements TranslocoLoader {
  private translations: Record<string, Translation> = {
    ro: ro as Translation,
    ru: ru as Translation
  };

  getTranslation(lang: string) {
    const translation = this.translations[lang];

    if (!translation) {
      console.warn(`Missing static translation bundle for language: ${lang}`);
      return of({});
    }

    return of(translation);
  }
}
