import {ChangeDetectionStrategy, Component, inject, InjectionToken, Signal} from '@angular/core';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {imageSliderMock} from '../../mock/image-skider-mock';
import {Socials} from '../socials/socials';
import {PromoSection} from './promo-section/promo-section';
import {ThemeService} from '../../@core/theme/theme.service';
import {Select} from 'primeng/select';

@Component({
  selector: 'app-home',
  imports: [ImageSlider, BestSellers, TextSlider, FadeUp, Socials, PromoSection, Select,],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home {
  images = imageSliderMock;
  themeService = inject(ThemeService)

  themes = [
    {label: 'Обычная', value: 'default'},
    {label: 'Black Friday', value: 'black-friday'},
    {label: 'Новый год', value: 'new-year'},
    {label: '8 марта', value: 'march-8'},
  ];

}
