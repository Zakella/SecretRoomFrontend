import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {Reels} from '../../shared/components/reels/reels';
import {MobileMenu} from '../../layout/mobile-menu/mobile-menu';
import {StoriesComponent} from '../../shared/components/stories/stories.component';


@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, BestSellers, TextSlider, FadeUp, Reels, MobileMenu, StoriesComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  images = [
    {
      imageSrc:
        'https://images.unsplash.com/photo-1460627390041-532a28402358?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
      imageAlt: 'nature1',
    },
    {
      imageSrc:
        'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
      imageAlt: 'nature2',
    },
    {
      imageSrc:
        'https://images.unsplash.com/photo-1640844444545-66e19eb6f549?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1032&q=80',
      imageAlt: 'person1',
    },
    {
      imageSrc:
        'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80',
      imageAlt: 'person2',
    },
  ]
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
