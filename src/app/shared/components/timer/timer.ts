import {Component, Input, OnDestroy, OnInit} from '@angular/core';
import {CountDown, Countdown} from '../../../@core/services/count-down';
import {Subscription} from 'rxjs';
import {DecimalPipe, NgIf} from '@angular/common';

@Component({
  selector: 'app-timer',
  imports: [
    DecimalPipe,
    NgIf
  ],
  templateUrl: './timer.html',
  styleUrl: './timer.scss'
})
export class Timer  implements OnInit, OnDestroy {
  @Input({ required: true }) endDate!: string | Date;
  time: Countdown = { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  private sub?: Subscription;

  constructor(private countdownService: CountDown) {}

  ngOnInit() {
    const date = new Date(this.endDate);
    this.sub = this.countdownService.createCountdown(date)
      .subscribe(t => this.time = t);
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
  }
}
