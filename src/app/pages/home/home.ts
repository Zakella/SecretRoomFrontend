import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';


@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, BestSellers, TextSlider, FadeUp],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  slides: any[] = [
    {
      id:1,
      url: '/assets/images/demo/slider1.jpeg',
      title: 'First slide',
      description: 'This is the first slide',
    },
    {
      id:2,
      url: '/assets/images/demo/slider2.jpeg',
      title: 'Second slide',
      description: 'This is the second slide',
    },
    {
      id:3,
      url: '/assets/images/demo/slider.avif',
      title: 'Third slide',
      description: 'This is the third slide',
    }
  ];

  goals = [
    { label: 'Dry Skin', image: '/assets/images/demo/goal1.jpg' },
    { label: 'Reduce Wrinkles', image: '/assets/images/demo/goal2.jpg' },
    { label: 'Damaged Hair', image: '/assets/images/demo/goal1.jpg' },
    { label: 'Clean Makeup', image: '/assets/images/demo/goal2.jpg' },
  ];
}
