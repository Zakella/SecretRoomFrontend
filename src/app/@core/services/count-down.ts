import { Injectable } from '@angular/core';
import {interval, map, Observable} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CountDown {
  createCountdown(targetDate: Date): Observable<Countdown> {
    return interval(1000).pipe(
      map(() => this.getTimeRemaining(targetDate))
    );
  }

  private getTimeRemaining(targetDate: Date): Countdown {
    const total = targetDate.getTime() - new Date().getTime();
    const seconds = Math.max(Math.floor((total / 1000) % 60), 0);
    const minutes = Math.max(Math.floor((total / 1000 / 60) % 60), 0);
    const hours   = Math.max(Math.floor((total / (1000 * 60 * 60)) % 24), 0);
    const days    = Math.max(Math.floor(total / (1000 * 60 * 60 * 24)), 0);

    return { total, days, hours, minutes, seconds };
  }
}

export interface Countdown {
  total: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
