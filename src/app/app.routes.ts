import {Routes} from '@angular/router';
import {Notfound} from './pages/notfound/notfound';
import {Home} from './pages/home/home';

export const routes: Routes = [
  {
    path: ':lang',
    children: [
      { path: '', component: Home },
      { path: '**', component: Notfound}
    ]
  },
  {
    path: '',
    redirectTo: 'ru',
    pathMatch: 'full'
  }


];
