import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-return-policy',
  imports: [
    NgIf
  ],
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
