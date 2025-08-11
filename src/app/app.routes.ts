import {Routes} from '@angular/router';
import {Notfound} from './pages/notfound/notfound';
import {Home} from './pages/home/home';
import {BbList} from './pages/bb-list/bb-list';
import {VsList} from './pages/vs-list/vs-list';
import {ProductDetail} from './pages/product-detail/product-detail';
import {Contacts} from './pages/contacts/contacts';
import {AboutUs} from './pages/about-us/about-us';
import {Wishlist} from './pages/wishlist/wishlist';
import {PaymentFail} from './pages/payment-fail/payment-fail';
import {Login} from './pages/login/login';
import {Cabinet} from './pages/cabinet/cabinet';
import {ResetPassword} from './pages/reset-password/reset-password';
import {DeliveryTerms} from './pages/delivery-terms/delivery-terms';
import {MainLayout} from './layout/main-layout/main-layout';
import {BlankLayout} from './layout/blank-layout/blank-layout';
import {Registration} from './pages/registration/registration';
import {Checkout} from './pages/checkout/checkout';

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
          {path: 'bb', component: BbList},
          {path: 'vs', component: VsList},
          {path: 'pd', component: ProductDetail},
          {path: 'contacts', component: Contacts},
          {path: 'about-us', component: AboutUs},
          {path: 'wishlist', component: Wishlist},
          {path: 'payment-fail', component: PaymentFail},
          {path: 'delivery-terms', component: DeliveryTerms},
          {path: 'cabinet', component: Cabinet},
          {path: 'checkout', component: Checkout},

        ],
      },
      {
        path: '',
        component: BlankLayout,
        children: [
          {path: 'profile', component: Login},
          {path: 'registration', component: Registration},
          {path: 'reset', component: ResetPassword},
          {path: '**', component: Notfound}
        ]
      }
    ]
  }
];
