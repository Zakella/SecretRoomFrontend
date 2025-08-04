import {Component, computed, inject} from '@angular/core';
import {Header} from './layout/header/header';
import {Footer} from './layout/footer/footer';
import {FloatingSidebar} from './layout/floating-sidebar/floating-sidebar';
import {ActivatedRoute, NavigationEnd, Router, RouterOutlet} from '@angular/router';
import {TranslocoService} from '@ngneat/transloco';
import {distinctUntilChanged, filter, map} from 'rxjs';
import {Loader} from './shared/components/loader/loader';
import {Cart} from './shared/components/cart/cart';
import {NgIf} from '@angular/common';
import {Notify} from './@core/services/notify';
import {Notification} from './shared/components/notification/notification';
import {ScrollTop} from './shared/components/scroll-top/scroll-top';
import {CartUi} from './shared/components/cart/services/cart';
import {CookieBanner} from './layout/cookie-banner/cookie-banner';

@Component({
  selector: 'app-root',
  imports: [Header, Footer, FloatingSidebar, RouterOutlet, Loader, Cart, NgIf, Notification, ScrollTop, CookieBanner],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {}
