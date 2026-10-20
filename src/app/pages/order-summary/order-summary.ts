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
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
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
