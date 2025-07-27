import {ChangeDetectionStrategy, Component} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, BestSellers, TextSlider],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  slides: any[] = [
    {
      id:1,
      url: 'https://images.pexels.com/photos/2834934/pexels-photo-2834934.jpeg',
      title: 'First slide',
      description: 'This is the first slide',
    },
    {
      id:2,
      url: 'https://images.pexels.com/photos/965989/pexels-photo-965989.jpeg',
      title: 'Second slide',
      description: 'This is the second slide',
    },
    {
      id:3,
      url: 'https://images.unsplash.com/photo-1586220742613-b731f66f7743?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
      title: 'Third slide',
      description: 'This is the third slide',
    }
  ];

  goals = [
    { label: 'Dry Skin', image: 'https://d2fwbsa91kuigh.cloudfront.net/media/catalog/category/1026966_Vitamin_E_Day_Cream_50ml_GOLDINAEHPS443_CT13.jpg' },
    { label: 'Reduce Wrinkles', image: 'https://www.sknclinics.co.uk/wp-content/uploads/2021/05/shutterstock_252456673-scaled.jpg' },
    { label: 'Color Care', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRkl43WOEN95b9APYvPHQtCWHioivOuSrxW_w&s' },
    { label: 'Damaged Hair', image: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTEscOddsVaU_uOqLYygW1W0MeaLieBdvA9Xw&s' },
    { label: 'Clean Makeup', image: 'https://kirobeauty.com/cdn/shop/files/apex_brown_quad_prod_launch_banner_on_03-02-25_mob.png?v=4765907173123040996' },
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
