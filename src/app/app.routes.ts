import {Routes} from '@angular/router';
import {Home} from './pages/home/home';
import {Contacts} from './pages/contacts/contacts';
import {Login} from './pages/login/login';
import {Cabinet} from './pages/cabinet/cabinet';
import {DeliveryTerms} from './pages/delivery-terms/delivery-terms';
import {ShippingInfo} from './pages/shipping-info/shipping-info';
import {MainLayout} from './layout/main-layout/main-layout';
import {BlankLayout} from './layout/blank-layout/blank-layout';
import {Registration} from './pages/registration/registration';
import {Checkout} from './pages/checkout/checkout';
import {OrderSummary} from './pages/order-summary/order-summary';
import {SearchResult} from './pages/search-result/search-result';
import {AccessGuard} from './@core/guards/acces-guard';
import {OurStory} from './pages/our-story/our-story';
import {AccountNotFound} from './pages/states/account-not-found/account-not-found';
import {ProductDetail} from './pages/products/product-detail/product-detail';
import { ProductResolver } from './pages/products/product-detail/product.resolver';
import {PaymentFail} from './pages/states/payment-fail/payment-fail';
import {Notfound} from './pages/states/notfound/notfound';
import {Catalog} from './pages/products/catalog/catalog';
import {OrderDetail} from './pages/order-detail/order-detail';
import {Brands} from './pages/brands/brands';
import {Favorites} from './pages/favorites/favorites';
import {ResetPasswordPage} from './pages/reset-password/reset-password-page';

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
            component: Catalog,
            data: {breadcrumb: {ro: 'Catalog', ru: 'Каталог'}}
          },
          {
            path: 'catalog/:tag',
            component: Catalog,
            data: {breadcrumb: {ro: 'Catalog', ru: 'Каталог'}}
          },
          {
            path: 'brands',
            component: Brands,
            data: {breadcrumb: {ro: 'Branduri', ru: 'Бренды'}}
          },
          {
            path: 'product/:id/:slug',
            component: ProductDetail,
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
            component: Contacts,
            data: {breadcrumb: {ro: 'Contacte', ru: 'Контакты'}}
          },
          {
            path: 'payment-fail',
            component: PaymentFail,
            data: {breadcrumb: {ro: 'Plata eșuată', ru: 'Ошибка оплаты'}}
          },
          {
            path: 'delivery-terms',
            component: DeliveryTerms,
            data: {breadcrumb: {ro: 'Termeni și condiții', ru: 'Правила и условия'}}
          },
          {
            path: 'shipping',
            component: ShippingInfo,
            data: {breadcrumb: {ro: 'Livrare', ru: 'Доставка'}}
          },
          {
            path: 'cabinet',
            canActivate: [AccessGuard],
            component: Cabinet,
            data: {breadcrumb: {ro: 'Contul meu', ru: 'Мой кабинет'}}
          },
          {
            path: 'order/:trackingNumber',
            canActivate: [AccessGuard],
            component: OrderDetail,
            data: {breadcrumb: {ro: 'Detalii comandă', ru: 'Детали заказа'}}
          },
          {
            path: 'checkout',
            component: Checkout,
            data: {breadcrumb: {ro: 'Finalizare comandă', ru: 'Оформление заказа'}}
          },
          {
            path: 'about-the-secret-room',
            component: OurStory,
            data: {breadcrumb: {ro: 'Despre noi', ru: 'О нас'}}
          },
          {
            path: 'favorites',
            component: Favorites,
            data: {breadcrumb: {ro: 'Favorite', ru: 'Избранное'}}
          },
          {
            path: 'search/:query',
            component: SearchResult,
            data: {breadcrumb: {ro: 'Rezultate căutare', ru: 'Результаты поиска'}}
          }
        ],
      },
      {
        path: '',
        component: BlankLayout,
        children: [
          {path: 'login', component: Login},
          {path: 'reset-password', component: ResetPasswordPage},
          {path: 'registration', component: Registration},
          {path: 'account-not-found', component: AccountNotFound},
          {path: 'order-success/:trackingNumber', component: OrderSummary},
          {path: '**', component: Notfound}
        ]
      }
    ]
  }
];
