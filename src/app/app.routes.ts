import {Routes} from '@angular/router';
import {Notfound} from './pages/notfound/notfound';
import {Home} from './pages/home/home';
import {VsList} from './pages/vs-list/vs-list';
import {ProductDetail} from './pages/product-detail/product-detail';
import {Contacts} from './pages/contacts/contacts';
import {AboutUs} from './pages/about-us/about-us';
import {Wishlist} from './pages/wishlist/wishlist';
import {PaymentFail} from './pages/payment-fail/payment-fail';
import {Login} from './pages/login/login';
import {Cabinet} from './pages/cabinet/cabinet';
import {DeliveryTerms} from './pages/delivery-terms/delivery-terms';
import {MainLayout} from './layout/main-layout/main-layout';
import {BlankLayout} from './layout/blank-layout/blank-layout';
import {Registration} from './pages/registration/registration';
import {Checkout} from './pages/checkout/checkout';
import {AccountNotFound} from './pages/account-not-found/account-not-found';
import {OrderSummary} from './pages/order-summary/order-summary';
import {PromotionCard} from './pages/promotion/promotion-card/promotion-card';
import {List} from './pages/promotion/list/list';
import {ProductResolver} from './pages/product-detail/product.resolver';
import {SearchResult} from './pages/search-result/search-result';
import {AccessGuard} from './@core/guards/acces-guard';
import {OurStory} from './pages/our-story/our-story';

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
            path: 'vs',
            component: VsList,
            data: { breadcrumb: 'Редактирование' }
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
            canActivate: [AccessGuard],
            component: Checkout},
          {path: 'promotion', component: PromotionCard},
          {path: 'promotion-list', component: List},
          {path: 'about-the-secret-room', component: OurStory},
          {path: 'test', component: SearchResult}
        ],
      },
      {
        path: '',
        component: BlankLayout,
        children: [
          {path: 'profile', component: Login},
          {path: 'registration', component: Registration},
          {path: 'account-not-found', component: AccountNotFound},
          {path: 'order-success', component: OrderSummary},
          {path: '**', component: Notfound}
        ]
      }
    ]
  }
];
