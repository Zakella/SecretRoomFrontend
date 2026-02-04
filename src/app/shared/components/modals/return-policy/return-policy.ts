import {Component, EventEmitter, Input, Output} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {Dialog} from 'primeng/dialog';

@Component({
  selector: 'return-policy',
  imports: [TranslocoPipe, Dialog],
  templateUrl: './return-policy.html',
  styleUrl: './return-policy.scss'
})
export class ReturnPolicy {
  @Input() open = false;
  // Название ОБЯЗАТЕЛЬНО должно быть openChange
  @Output() openChange = new EventEmitter<boolean>();

  close() {
    this.open = false; // Меняем локально
    this.openChange.emit(false); // Уведомляем родителя (Footer)
  }
}
