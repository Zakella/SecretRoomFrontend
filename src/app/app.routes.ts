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

export const routes: Routes = [
  {
    path: ':lang',
    children: [
      {path: '', component: Home},
      {path: 'bb', component: BbList},
      {path: 'vs', component: VsList},
/*
      {path: ':id', component: ProductDetail},
*/
      {path: 'contacts', component: Contacts},
      {path: 'about-us', component: AboutUs},
      {path: 'wishlist', component: Wishlist},
      {path: 'payment-fail', component: PaymentFail},
      {path: 'delivery-terms', component: AboutUs},
      {path: '**', component: Notfound}
    ]
  },
  {
    path: '',
    redirectTo: 'ru',
    pathMatch: 'full',
  }


];
