import {
  ApplicationConfig,
  isDevMode,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';
import {provideRouter, withInMemoryScrolling} from '@angular/router';
import {routes} from './app.routes';
import {provideClientHydration} from '@angular/platform-browser';
import {HTTP_INTERCEPTORS, provideHttpClient, withFetch} from '@angular/common/http';
import {provideTransloco} from '@ngneat/transloco';
import {TranslocateHttpLoader} from './@core/configs/transloco-config';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {provideAnimations} from '@angular/platform-browser/animations';
import {LoaderInterceptor} from './@core/interceptors/loader-interceptor';
import {providePrimeNG} from "primeng/config";
import Aura from '@primeuix/themes/aura';
import {MessageService} from 'primeng/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled'
      })
    ),
    provideAnimationsAsync(),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Aura
      }
    }),
    MessageService,
    provideTransloco({
      config: {
        availableLangs: ['ro', 'ru'],
        defaultLang: 'ru',
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: TranslocateHttpLoader
    }),
    provideHttpClient(withFetch()),
    provideClientHydration(),
    {provide: HTTP_INTERCEPTORS, useClass: LoaderInterceptor, multi: true},
  ]
};
