import {computed, Injectable, signal} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter} from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbsService {
  private readonly _breadcrumbs = signal<BreadcrumbItem[]>([]);
  readonly breadcrumbs = computed(() => this._breadcrumbs());

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        const breadcrumbs = this.build(this.route.root);
        this._breadcrumbs.set(breadcrumbs);
      });
  }

  private build(
    route: ActivatedRoute,
    url = '',
    acc: BreadcrumbItem[] = []
  ): BreadcrumbItem[] {
    let child = route.firstChild;
    if (!child) return acc;
    while (
      child &&
      child.snapshot.url.length === 0 &&
      !child.snapshot.data['breadcrumb']
      ) {
      child = child.firstChild!;
    }

    if (!child) return acc;

    const part = child.snapshot.url.map(s => s.path).join('/');
    if (part) {
      url += `/${part}`;
    }

    const label = child.snapshot.data['breadcrumb'];
    if (label) {
      acc.push({ label, url });
    }

    return this.build(child, url, acc);
  }

}
