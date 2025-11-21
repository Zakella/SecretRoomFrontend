import {ChangeDetectionStrategy, Component, inject, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ImageSlider} from '../../shared/components/image-slider/image-slider';
import {BestSellers} from '../../shared/components/best-sellers/best-sellers';
import {TextSlider} from '../../shared/components/text-slider/text-slider';
import {FadeUp} from '../../@core/directives/fade-up';
import {MobileMenu} from '../../layout/mobile-menu/mobile-menu';
import {imageSliderMock} from '../../mock/image-skider-mock';
import {GOALS, PROMOS_MOCK} from '../../mock/goals';
import {Socials} from '../socials/socials';
import {ProductCategoryService} from '../../@core/api/product-category';
import {ModalCertificate} from '../../shared/components/modals/modal-certificate/modal-certificate';
import {MobileRedirectBanner} from '../../layout/mobile-redirect-banner/mobile-redirect-banner';
import {PromoSection} from './promo-section/promo-section';


@Component({
  selector: 'app-home',
  imports: [RouterLink, ImageSlider, BestSellers, TextSlider, FadeUp, Socials, PromoSection],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class Home implements OnInit{
  images = imageSliderMock;
  ngOnInit() {}
}
