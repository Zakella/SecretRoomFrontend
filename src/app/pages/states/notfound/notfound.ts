import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';

@Component({
  selector: 'app-notfound',
  imports: [
    RouterLink
  ],
  templateUrl: './notfound.html',
  styleUrl: './notfound.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Notfound {

}
