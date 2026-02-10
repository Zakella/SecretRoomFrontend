import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {PurchaseService} from '../../@core/api/purchase';
import {OrderReview} from '../../entities/order-review';
import {Subject} from 'rxjs';
import {takeUntil} from 'rxjs/operators';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {LocalizedNamePipe} from '../../shared/pipes/localized-name.pipe';
import {CurrencyPipe} from '@angular/common';
import {GoogleAnalytics} from '../../@core/services/google-analytics';

@Component({
  selector: 'app-order-summary',
  imports: [
    RouterLink,
    TranslocoPipe,
    CurrencyPipe,
    LocalizedNamePipe
  ],
  templateUrl: './order-summary.html',
  styleUrl: './order-summary.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OrderSummary implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private purchaseService = inject(PurchaseService);
  private cdr = inject(ChangeDetectorRef);
  private langService = inject(Language);
  private ga = inject(GoogleAnalytics);
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;
  orderReview = signal<OrderReview | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    const trackingNumber = this.route.snapshot.paramMap.get('trackingNumber');
    if (trackingNumber) {
      this.loadOrderDetails(trackingNumber);
    } else {
      this.error.set('Order tracking number not found');
      this.isLoading.set(false);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadOrderDetails(trackingNumber: string): void {
    this.purchaseService.getOrderDetails(trackingNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.orderReview.set(order);
          this.trackPurchase(order);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Failed to load order details:', err);
          this.error.set('Failed to load order details');
          this.isLoading.set(false);
          this.cdr.markForCheck();
        }
      });
  }

  private trackPurchase(order: OrderReview) {
    this.ga.send({
      event: 'purchase',
      category: 'ecommerce',
      label: order.orderNumber,
      value: order.totalAmountOrder
    });
  }
}
