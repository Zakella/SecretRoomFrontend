import { bootstrapApplication } from '@angular/platform-browser';
import { App } from './app/app';
import { config } from './app/app.config.server';
import { importProvidersFrom } from '@angular/core';

const bootstrap = (context?: any) =>
  bootstrapApplication(App, {
    ...config,
    providers: [
      ...(config.providers || []),
      { provide: 'SSR_CONTEXT', useValue: context } // передаем context через DI
    ]
  });

export default bootstrap;
