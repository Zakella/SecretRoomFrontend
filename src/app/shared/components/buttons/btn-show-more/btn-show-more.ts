import {ChangeDetectionStrategy, Component, ViewEncapsulation} from '@angular/core';

@Component({
  selector: 'app-btn-show-more',
  imports: [],
  templateUrl: './btn-show-more.html',
  styleUrl: './btn-show-more.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class BtnShowMore {}
