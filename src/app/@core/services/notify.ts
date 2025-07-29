import {Injectable, signal} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class Notify {
  private readonly _notifications = signal<Notification[]>([]);

  readonly notifications = this._notifications.asReadonly();

  show(text: string, type: NotificationType = 'info') {
    const newMessage: Notification = { text, type };
    this._notifications.update(n => [...n, newMessage]);

    // автоудаление через 4 сек
    setTimeout(() => {
      this._notifications.update(n => n.filter(m => m !== newMessage));
    }, 10000);
  }

  success(text: string) {
    this.show(text, 'success');
  }

  error(text: string) {
    this.show(text, 'error');
  }

  info(text: string) {
    this.show(text, 'info');
  }
}
export type NotificationType = 'success' | 'error' | 'info';

export interface Notification {
  text: string;
  type: NotificationType;
}
