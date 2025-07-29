import {Component, computed} from '@angular/core';
import {Notify} from '../../../@core/services/notify';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-notification',
  imports: [
    NgClass
  ],
  templateUrl: './notification.html',
  styleUrl: './notification.scss'
})
export class Notification {
  notifications = computed(() => this.notify.notifications());

  constructor(private notify: Notify) {}
}
