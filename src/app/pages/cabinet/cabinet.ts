import {ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnDestroy, OnInit, signal} from '@angular/core';
import {Authentication} from '../../@core/auth/authentication';
import {CurrencyPipe, DatePipe, NgClass} from '@angular/common';
import {UserDetails} from '../../entities/user-details';
import {UserService} from '../../@core/services/user-service';
import {Order} from '../../entities/order';
import {Router, RouterLink} from '@angular/router';
import {Language} from '../../@core/services/language';
import {LocalizedNamePipe} from '../../shared/pipes/localized-name.pipe';
import {TranslocoPipe} from '@ngneat/transloco';
import {Subject, takeUntil} from 'rxjs';

@Component({
  selector: 'app-cabinet',
  imports: [
    DatePipe,
    RouterLink,
    TranslocoPipe,
    NgClass,
    LocalizedNamePipe
  ],
  templateUrl: './cabinet.html',
  styleUrl: './cabinet.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Cabinet implements OnInit, OnDestroy {
  orders = signal<Order[]>([]);
  isLoading = signal(true);
  error = signal<string | null>(null);

  userDetails: UserDetails | null = null;
  userFirstName = '';
  userLastName = '';
  userEmail = '';

  private authService = inject(Authentication);
  private userService = inject(UserService);
  private langService = inject(Language);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  activeLang = this.langService.currentLanguage;

  ngOnInit(): void {
    this.loadUserDetails();
    this.loadOrders();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserDetails(): void {
    this.userDetails = this.authService.getUserDetails();
    if (this.userDetails) {
      this.userFirstName = this.userDetails.givenName || '';
      this.userLastName = this.userDetails.familyName || '';
      this.userEmail = this.userDetails.email || '';
    }
  }

  private loadOrders(): void {
    if (!this.userEmail) {
      this.isLoading.set(false);
      return;
    }

    this.userService.getCustomerOrders(this.userEmail)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (accountInfo) => {
          this.orders.set(accountInfo.orders || []);
          this.isLoading.set(false);
          this.cdr.markForCheck();
        },
        error: () => {
          this.error.set('cabinet.loadError');
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

  viewOrderDetails(order: Order): void {
    if (order.orderTrackingNumber) {
      this.router.navigate(['/', this.activeLang(), 'order', order.orderTrackingNumber]);
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/', this.activeLang(), 'profile']);
  }

  retryLoad(): void {
    this.error.set(null);
    this.isLoading.set(true);
    this.loadOrders();
  }
}