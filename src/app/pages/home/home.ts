import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {Reels} from '../../shared/components/reels/reels';
import {MobileMenu} from '../../layout/mobile-menu/mobile-menu';
import {imageSliderMock} from '../../mock/image-skider-mock';
import {GOALS} from '../../mock/goals';


@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, BestSellers, TextSlider, FadeUp, Reels, MobileMenu],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  images = imageSliderMock;
  goals = GOALS;
}
