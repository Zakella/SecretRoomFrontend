import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
  signal,
  ViewEncapsulation
} from '@angular/core';
import {DrawerModule} from 'primeng/drawer';
import {ButtonModule} from 'primeng/button';
import {FormControl, FormGroup} from '@angular/forms';
export interface FilterConfig {
  type: 'text' | 'select' | 'date' | 'range';
  field: string;
  label: string;
  options?: { label: string; value: any }[];
}

@Component({
  selector: 'product-filter',
  imports: [DrawerModule, ButtonModule],
  templateUrl: './product-filter.html',
  styleUrl: './product-filter.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class ProductFilter {
  visible = signal(false);
  @Input() filters: FilterConfig[] = [];
  @Output() apply = new EventEmitter<any>();
  @Output() reset = new EventEmitter<void>();

  form!: FormGroup;

  ngOnInit() {
    const controls: Record<string, FormControl> = {};

    this.filters.forEach(f => {
      controls[f.field] = new FormControl(null);
    });

    this.form = new FormGroup(controls);
  }

  onApply() {
    this.apply.emit(this.form.value);
    this.visible.set(false);
  }

  onReset() {
    this.form.reset();
    this.reset.emit();
  }

}
