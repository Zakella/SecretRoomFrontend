import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';

@Component({
  selector: 'app-our-story',
  imports: [],
  templateUrl: './our-story.html',
  styleUrl: './our-story.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OurStory implements OnInit {
  private metaService = inject(MetaService);
  private langService = inject(Language);

  protected activeLang = this.langService.currentLanguage;

  ngOnInit() {
    const isRo = this.activeLang() === 'ro';
    this.metaService.updateTitle(isRo
      ? 'Despre Noi — Secret Room | Victoria\'s Secret și Bath & Body Works Moldova'
      : 'О Нас — Secret Room | Victoria\'s Secret и Bath & Body Works Молдова');
    this.metaService.updateDescription(isRo
      ? 'Secret Room — produse originale Victoria\'s Secret și Bath & Body Works în Moldova. Parfumuri, cosmetice, lenjerie. Livrare rapidă în toată țara.'
      : 'Secret Room — оригинальная продукция Victoria\'s Secret и Bath & Body Works в Молдове. Парфюмы, косметика, бельё. Быстрая доставка по всей стране.');
    this.metaService.updateKeywords('Secret Room Moldova, despre noi, Victoria\'s Secret, Bath & Body Works, parfumuri originale, Chișinău, оригинальная продукция');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');
  }
}
