import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {Dialog} from 'primeng/dialog';

@Component({
  selector: 'app-return-policy',
  imports: [TranslocoPipe, Dialog],
  templateUrl: './return-policy.html',
  styleUrl: './return-policy.scss'
})
export class ReturnPolicy {
  @Input() open = false;
  @Output() closed = new EventEmitter<void>();

  close() {
    this.closed.emit();
  }
}
