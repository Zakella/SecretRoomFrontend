import {ChangeDetectionStrategy, Component} from '@angular/core';

@Component({
  selector: 'best-sellers',
  imports: [],
  templateUrl: './best-sellers.html',
  styleUrl: './best-sellers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BestSellers {
  protected readonly categories: string[] = ['SKINCARE', 'MAKEUP', 'HAIR', 'BODY', 'WELLNESS', 'NEW'];
}
