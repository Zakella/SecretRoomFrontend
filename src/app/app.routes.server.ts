import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: ':lang/product/:id/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: ':lang/catalog/brand/:brandName',
    renderMode: RenderMode.Server
  },
  {
    path: ':lang/catalog/:tag',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Server
  }
];
