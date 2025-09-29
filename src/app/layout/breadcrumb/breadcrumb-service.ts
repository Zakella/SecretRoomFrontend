import {Injectable} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {Breadcrumbs} from '../../entities/breadcrumb';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<Breadcrumbs[]>([]);
  breadcrumbs$ = this.breadcrumbsSubject.asObservable();

  constructor(private router: Router, private activatedRoute: ActivatedRoute) {
    this.initBreadcrumbs();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) {
        this.initBreadcrumbs();
      }
    });
  }

  private initBreadcrumbs(): void {
    const breadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: Breadcrumbs[] = [],
    productName?: string
  ): Breadcrumbs[] {
    const label = route.routeConfig
      ? route.snapshot.data['breadcrumb']
      : 'Главная';
    const path = route.routeConfig
      ? route.routeConfig.path
      : '';
    const nextUrl = `${url}${path}/`;

    const breadcrumbLabel = (label === 'Product' && productName)
      ? productName
      : label;

    const breadcrumb = {
      label: breadcrumbLabel,
      url: nextUrl,
    };

    let newBreadcrumbs: Breadcrumbs[] = [...breadcrumbs];

    if (breadcrumbLabel !== 'Главная' || breadcrumbs.length > 0) {
      newBreadcrumbs = [...breadcrumbs, breadcrumb];
    }

    if (route.firstChild && route.firstChild.routeConfig?.path) {
      return this.createBreadcrumbs(route.firstChild, nextUrl, newBreadcrumbs, productName);
    }

    return newBreadcrumbs;
  }

  setBreadcrumbs(breadcrumbs: Breadcrumbs[]): void {
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  getBreadcrumbs(): Breadcrumbs[] {
    return this.breadcrumbsSubject.getValue();
  }
}
