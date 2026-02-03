import {Routes} from '@angular/router';
import {Home} from './pages/home/home';
import {Contacts} from './pages/contacts/contacts';
import {AboutUs} from './pages/about-us/about-us';
import {Wishlist} from './pages/wishlist/wishlist';
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
import {Catalog} from './pages/catalog/catalog';
import {AccountNotFound} from './pages/states/account-not-found/account-not-found';
import {ProductDetail} from './pages/products/product-detail/product-detail';
import { ProductResolver } from './pages/products/product-detail/product.resolver';
import {PaymentFail} from './pages/states/payment-fail/payment-fail';
import {Notfound} from './pages/states/notfound/notfound';

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
            path: 'catalog/:tag',
            component: Catalog,
            data: {breadcrumb: 'Редактирование'}
          },
          {
            path: 'product-detail/:id',
            component: ProductDetail,
            resolve: {
              product: ProductResolver
            }
          },
          {path: 'contacts', component: Contacts},
          {path: 'about-us', component: AboutUs},
          {path: 'wishlist', component: Wishlist},
          {path: 'payment-fail', component: PaymentFail},
          {path: 'delivery-terms', component: DeliveryTerms},
          {
            path: 'cabinet',
            canActivate: [AccessGuard],
            component: Cabinet
          },
          {
            path: 'checkout',
            component: Checkout
          },
          {path: 'promotion', component: PromotionCard},
          {path: 'promotion-list', component: List},
          {path: 'about-the-secret-room', component: OurStory},
          {path: 'search/:query', component: SearchResult}
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
