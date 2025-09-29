import {Routes} from '@angular/router';

const promotionRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./list/list').then(m => m.List),
  },
  {
    path: ':id',
    loadComponent: () => import('./promotion-card/promotion-card').then(m => m.PromotionCard),
  }
];

export default promotionRoutes;
