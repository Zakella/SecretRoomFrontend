import { mergeApplicationConfig, ApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';
import { SSR_API_URL } from './@core/tokens/ssr-api-url.token';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    { provide: SSR_API_URL, useValue: process.env['SSR_API_URL'] || '' }
  ]
};

export const config = mergeApplicationConfig(appConfig, serverConfig);
