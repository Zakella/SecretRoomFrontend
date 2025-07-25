import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {ProductCard} from '../../shared/components/product-card/product-card';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, ProductCard, BestSellers],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  slides: any[] = [
    {
      url: 'https://images.pexels.com/photos/2834934/pexels-photo-2834934.jpeg',
      title: 'First slide',
      description: 'This is the first slide',
    },
    {
      url: 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg',
      title: 'Second slide',
      description: 'This is the second slide',
    },
    {
      url: 'https://images.unsplash.com/photo-1586220742613-b731f66f7743?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Third slide',
      description: 'This is the third slide',
    }
  ];
  goals = [
    { label: 'Dry Skin', image: '/assets/goals/dry-skin.jpg' },
    { label: 'Reduce Wrinkles', image: '/assets/goals/wrinkles.jpg' },
    { label: 'Acne and Blemishes', image: '/assets/goals/acne.jpg' },
    { label: 'Color Care', image: '/assets/goals/color-care.jpg' },
    { label: 'Damaged Hair', image: '/assets/goals/damaged-hair.jpg' },
    { label: 'Clean Makeup', image: '/assets/goals/clean-makeup.jpg' },
    { label: 'Overall Wellness', image: '/assets/goals/wellness.jpg' }
  ];

  brands = [
    {
      name: 'Victoria\'s Secret',
      logo: 'https://sp-ao.shortpixel.ai/client/to_auto,q_glossy,ret_img/https://www.placedeshalles.com/wp-content/uploads/2023/09/10.25-Opening-Strasburgo768x443_02-768x443.jpg',
      link: '/brands/odacite'
    },
    {
      name: 'Bath and Body Works',
      logo: 'https://www.infinitimall.com/wp-content/uploads/2023/04/Bath-Body-Works-Infiniti-Mall-MAlad.jpg',
      link: '/brands/le-prunier'
    },
  ];
}
