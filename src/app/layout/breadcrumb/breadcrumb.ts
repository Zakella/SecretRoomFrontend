import {Component, inject} from '@angular/core';
import {RouterLink} from '@angular/router';
import {NgForOf, NgIf} from '@angular/common';
import {BreadcrumbsService} from '../../@core/services/breadcrumb';

@Component({
  selector: 'breadcrumb',
  imports: [
  ],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss'
})
export class Breadcrumb{
  private readonly service = inject(BreadcrumbsService);
  readonly breadcrumbs = this.service.breadcrumbs;

}
