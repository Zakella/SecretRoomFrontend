import {ChangeDetectionStrategy, Component} from '@angular/core';
import {FadeUp} from '../../@core/directives/fade-up';

@Component({
  selector: 'app-about-us',
  imports: [FadeUp],
  templateUrl: './about-us.html',
  styleUrl: './about-us.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AboutUs {

}
