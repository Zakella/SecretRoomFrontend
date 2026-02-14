import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {BreadcrumbsService} from '../../@core/services/breadcrumb';

@Component({
  selector: 'breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss'
})
export class Breadcrumb {
  private readonly service = inject(BreadcrumbsService);
  readonly breadcrumbs = this.service.breadcrumbs;
}
