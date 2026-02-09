import {Routes} from '@angular/router';
import {Home} from './pages/home/home';
import {Contacts} from './pages/contacts/contacts';
import {Login} from './pages/login/login';
import {Cabinet} from './pages/cabinet/cabinet';
import {DeliveryTerms} from './pages/delivery-terms/delivery-terms';
import {MainLayout} from './layout/main-layout/main-layout';
import {BlankLayout} from './layout/blank-layout/blank-layout';
import {Registration} from './pages/registration/registration';
import {Checkout} from './pages/checkout/checkout';
import {OrderSummary} from './pages/order-summary/order-summary';
import {PromotionCard} from './pages/promotion/promotion-card/promotion-card';
import {List} from './pages/promotion/list/list';
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
            data: {breadcrumb: 'Catalog'}
          },
          {
            path: 'catalog/:tag',
            component: Catalog,
            data: {breadcrumb: 'Catalog'}
          },
          {
            path: 'brands',
            component: Brands,
            data: {breadcrumb: 'Brands'}
          },
          {
            path: 'product/:id/:slug',
            component: ProductDetail,
            resolve: {
              product: ProductResolver
            },
            data: {breadcrumb: 'Product Details'}
          },
          {
            path: 'product-detail/:id',
            redirectTo: 'product/:id',
            pathMatch: 'full'
          },
          {
            path: 'contacts',
            component: Contacts,
            data: {breadcrumb: 'Contacts'}
          },
          {
            path: 'payment-fail',
            component: PaymentFail,
            data: {breadcrumb: 'Payment Failed'}
          },
          {
            path: 'delivery-terms',
            component: DeliveryTerms,
            data: {breadcrumb: 'Delivery Terms'}
          },
          {
            path: 'cabinet',
            canActivate: [AccessGuard],
            component: Cabinet,
            data: {breadcrumb: 'Cabinet'}
          },
          {
            path: 'order/:trackingNumber',
            canActivate: [AccessGuard],
            component: OrderDetail,
            data: {breadcrumb: 'Order Details'}
          },
          {
            path: 'checkout',
            component: Checkout,
            data: {breadcrumb: 'Checkout'}
          },
          {
            path: 'promotion',
            component: PromotionCard,
            data: {breadcrumb: 'Promotion'}
          },
          {
            path: 'promotion-list',
            component: List,
            data: {breadcrumb: 'Promotions'}
          },
          {
            path: 'about-the-secret-room',
            component: OurStory,
            data: {breadcrumb: 'Our Story'}
          },
          {
            path: 'favorites',
            component: Favorites,
            data: {breadcrumb: 'Favorites'}
          },
          {
            path: 'search/:query',
            component: SearchResult,
            data: {breadcrumb: 'Search Results'}
          }
        ],
      },
      {
        path: '',
        component: BlankLayout,
        children: [
          {path: 'profile', component: Login},
          {path: 'registration', component: Registration},
          {path: 'account-not-found', component: AccountNotFound},
          {path: 'order-success/:trackingNumber', component: OrderSummary},
          {path: '**', component: Notfound}
        ]
      }
    ]
  }
];
