import {Component, inject, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {AsyncPipe} from '@angular/common';
import {Observable} from 'rxjs';
import {Breadcrumbs} from '../../entities/breadcrumb';
import {BreadcrumbService} from './breadcrumb-service';

@Component({
  selector: 'app-breadcrumb',
  imports: [
    RouterLink,
    AsyncPipe
  ],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.scss'
})
export class Breadcrumb implements OnInit{
  breadcrumbs$!: Observable<Breadcrumbs[]>;
  private breadcrumbsService = inject(BreadcrumbService);

  ngOnInit() {
    this.breadcrumbs$ = this.breadcrumbsService.breadcrumbs$;
  }

}
