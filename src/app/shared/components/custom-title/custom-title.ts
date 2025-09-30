import {Component, input} from '@angular/core';

@Component({
  selector: 'custom-title',
  imports: [],
  templateUrl: './custom-title.html',
  styleUrl: './custom-title.scss'
})
export class CustomTitle {
  public readonly title = input<string>('');
}
