import {Routes} from '@angular/router';
import {Home} from './pages/home/home';
import {MainLayout} from './layout/main-layout/main-layout';
import {BlankLayout} from './layout/blank-layout/blank-layout';
import {AccessGuard} from './@core/guards/acces-guard';
import { ProductResolver } from './pages/products/product-detail/product.resolver';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'ru',
    pathMatch: 'full',
  },
  {
    path: ':lang',
    children: [
      {
        path: '',
        component: MainLayout,
        children: [
          {path: '', component: Home},
          {
            path: 'catalog/brand/:brandName',
            loadComponent: () => import('./pages/products/catalog/catalog').then(m => m.Catalog),
            data: {breadcrumb: {ro: 'Catalog', ru: 'Каталог'}}
          },
          {
            path: 'catalog/:tag',
            loadComponent: () => import('./pages/products/catalog/catalog').then(m => m.Catalog),
            data: {breadcrumb: {ro: 'Catalog', ru: 'Каталог'}}
          },
          {
            path: 'brands',
            loadComponent: () => import('./pages/brands/brands').then(m => m.Brands),
            data: {breadcrumb: {ro: 'Branduri', ru: 'Бренды'}}
          },
          {
            path: 'product/:id/:slug',
            loadComponent: () => import('./pages/products/product-detail/product-detail').then(m => m.ProductDetail),
            resolve: {
              product: ProductResolver
            },
            data: {breadcrumb: {ro: 'Produs', ru: 'Товар'}}
          },
          {
            path: 'product-detail/:id',
            redirectTo: 'product/:id/details',
            pathMatch: 'full'
          },
          {
            path: 'contacts',
            loadComponent: () => import('./pages/contacts/contacts').then(m => m.Contacts),
            data: {breadcrumb: {ro: 'Contacte', ru: 'Контакты'}}
          },
          {
            path: 'payment-fail',
            loadComponent: () => import('./pages/states/payment-fail/payment-fail').then(m => m.PaymentFail),
            data: {breadcrumb: {ro: 'Plata eșuată', ru: 'Ошибка оплаты'}}
          },
          {
            path: 'delivery-terms',
            loadComponent: () => import('./pages/delivery-terms/delivery-terms').then(m => m.DeliveryTerms),
            data: {breadcrumb: {ro: 'Termeni și condiții', ru: 'Правила и условия'}}
          },
          {
            path: 'shipping',
            loadComponent: () => import('./pages/shipping-info/shipping-info').then(m => m.ShippingInfo),
            data: {breadcrumb: {ro: 'Livrare', ru: 'Доставка'}}
          },
          {
            path: 'cabinet',
            canActivate: [AccessGuard],
            loadComponent: () => import('./pages/cabinet/cabinet').then(m => m.Cabinet),
            data: {breadcrumb: {ro: 'Contul meu', ru: 'Мой кабинет'}}
          },
          {
            path: 'order/:trackingNumber',
            canActivate: [AccessGuard],
            loadComponent: () => import('./pages/order-detail/order-detail').then(m => m.OrderDetail),
            data: {breadcrumb: {ro: 'Detalii comandă', ru: 'Детали заказа'}}
          },
          {
            path: 'checkout',
            loadComponent: () => import('./pages/checkout/checkout').then(m => m.Checkout),
            data: {breadcrumb: {ro: 'Finalizare comandă', ru: 'Оформление заказа'}}
          },
          {
            path: 'about-the-secret-room',
            loadComponent: () => import('./pages/our-story/our-story').then(m => m.OurStory),
            data: {breadcrumb: {ro: 'Despre noi', ru: 'О нас'}}
          },
          {
            path: 'favorites',
            loadComponent: () => import('./pages/favorites/favorites').then(m => m.Favorites),
            data: {breadcrumb: {ro: 'Favorite', ru: 'Избранное'}}
          },
          {
            path: 'search/:query',
            loadComponent: () => import('./pages/search-result/search-result').then(m => m.SearchResult),
            data: {breadcrumb: {ro: 'Rezultate căutare', ru: 'Результаты поиска'}}
          }
        ],
      },
      {
        path: '',
        component: BlankLayout,
        children: [
          {path: 'login', loadComponent: () => import('./pages/login/login').then(m => m.Login)},
          {path: 'reset-password', loadComponent: () => import('./pages/reset-password/reset-password-page').then(m => m.ResetPasswordPage)},
          {path: 'registration', loadComponent: () => import('./pages/registration/registration').then(m => m.Registration)},
          {path: 'account-not-found', loadComponent: () => import('./pages/states/account-not-found/account-not-found').then(m => m.AccountNotFound)},
          {path: 'order-success/:trackingNumber', loadComponent: () => import('./pages/order-summary/order-summary').then(m => m.OrderSummary)},
          {path: '**', loadComponent: () => import('./pages/states/notfound/notfound').then(m => m.Notfound)}
        ]
      }
    ]
  }
];
