import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, PLATFORM_ID, signal} from '@angular/core';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {PurchaseService} from '../../@core/api/purchase';
import {OrderReview} from '../../entities/order-review';
import {EMPTY, Subject, timer} from 'rxjs';
import {catchError, switchMap, take, takeUntil, takeWhile, tap} from 'rxjs/operators';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../@core/services/language';
import {LocalizedNamePipe} from '../../shared/pipes/localized-name.pipe';
import {CurrencyPipe, isPlatformBrowser} from '@angular/common';
import {GoogleAnalytics} from '../../@core/services/google-analytics';
import {PendingPayment} from '../../shared/components/cart/services/pending-payment';
import {SiteTracker} from '../../@core/api/site-tracker';
import {OrderItem} from '../../entities/order';
import {PromoLabelPipe} from '../../shared/pipes/promo-label.pipe';

@Component({
  selector: 'app-order-summary',
  imports: [
    RouterLink,
    TranslocoPipe,
    CurrencyPipe,
    LocalizedNamePipe,
    PromoLabelPipe
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
  private pendingPayment = inject(PendingPayment);
  private tracker = inject(SiteTracker);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;
  orderReview = signal<OrderReview | null>(null);
  isLoading = signal(true);
  error = signal<string | null>(null);

  /** SR-229: the line was discounted by a promotion (OrderReview carries lineTotal and promotionSavings). */
  hasPromo(item: OrderItem): boolean {
    return (item.promotionSavings ?? 0) > 0 && item.lineTotal != null;
  }

  /** Promotion discount of the order; 0 — no row, page as before. */
  promotionSavings(order: OrderReview): number {
    return order.promotionSavings ?? 0;
  }

  /** subtotal of OrderReview is already after the promotion: show the sum before it above the discount row. */
  subtotalBeforePromo(order: OrderReview): number {
    return order.subtotal + this.promotionSavings(order);
  }

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

  // MAIB мог вернуть покупателя раньше callback'а: до 5 раз раз в 3 с ждём выхода из PAYMENT_WAITING
  private pollUntilPaid(trackingNumber: string): void {
    timer(3000, 3000).pipe(
      take(5),
      switchMap(() => this.purchaseService.getOrderDetails(trackingNumber).pipe(catchError(() => EMPTY))),
      tap(order => {
        this.orderReview.set(order);
        this.ga.trackPurchase(order);
        this.cdr.markForCheck();
      }),
      takeWhile(order => order.status === 'PAYMENT_WAITING'),
      takeUntil(this.destroy$)
    ).subscribe();
  }

  private loadOrderDetails(trackingNumber: string): void {
    this.purchaseService.getOrderDetails(trackingNumber)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (order) => {
          this.orderReview.set(order);
          this.ga.trackPurchase(order);
          this.tracker.orderLink(order, trackingNumber);
          // Online payment kept the cart while the customer was on MAIB — the order is accepted now
          if (this.isBrowser) this.pendingPayment.settle(trackingNumber, order.status);
          if (order.status === 'PAYMENT_WAITING' && this.isBrowser) this.pollUntilPaid(trackingNumber);
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
}
