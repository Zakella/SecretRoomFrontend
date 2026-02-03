import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {DatePipe, NgClass} from '@angular/common';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {Order} from '../../entities/order';
import {Subject, takeUntil} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {environment} from '../../../environments/environment';

@Component({
  selector: 'app-order-detail',
  imports: [
    DatePipe,
    RouterLink,
    TranslocoPipe,
    NgClass
  ],
  templateUrl: './order-detail.html',
  styleUrl: './order-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderDetail implements OnInit, OnDestroy {
  order = signal<Order | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private langService = inject(Language);
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;

  ngOnInit(): void {
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        const trackingNumber = params['trackingNumber'];
        if (trackingNumber) {
          this.loadOrder(trackingNumber);
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrder(trackingNumber: string): void {
    this.isLoading.set(true);
    this.error.set(null);

    this.http.get<Order>(`${environment.apiUrl}v1/order/${trackingNumber}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error.set('orderDetail.loadError');
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'DELIVERED': return 'status-delivered';
      case 'SHIPPED': return 'status-shipped';
      case 'PROCESSING': return 'status-processing';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'DELIVERED': return 'cabinet.status.delivered';
      case 'SHIPPED': return 'cabinet.status.shipped';
      case 'PROCESSING': return 'cabinet.status.processing';
      case 'CANCELLED': return 'cabinet.status.cancelled';
      default: return 'cabinet.status.pending';
    }
  }

  getPaymentLabel(payment?: string): string {
    switch (payment) {
      case 'OnlinePayment': return 'orderDetail.payment.online';
      case 'CashOnDelivery': return 'orderDetail.payment.cash';
      case 'CardOnDelivery': return 'orderDetail.payment.card';
      default: return payment || '';
    }
  }

  goBack(): void {
    this.router.navigate(['/', this.activeLang(), 'cabinet']);
  }

  retryLoad(): void {
    const trackingNumber = this.route.snapshot.params['trackingNumber'];
    if (trackingNumber) {
      this.loadOrder(trackingNumber);
    }
  }
}