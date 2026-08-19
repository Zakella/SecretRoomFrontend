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
    // RO-версия ранжируется на позиции 1.76 при 387 показах и 1 клике — проблема в сниппете,
    // а не в позиции. Заголовок «Despre Noi» ни о чём не говорит в выдаче; RU-близнец с более
    // конкретной формулировкой на позиции 5.79 даёт 57 кликов.
    this.metaService.updateTitle(isRo
      ? 'Secret Room Chișinău — magazin Victoria\'s Secret și Bath & Body Works'
      : 'О Нас — Secret Room | Victoria\'s Secret и Bath & Body Works Молдова');
    this.metaService.updateDescription(isRo
      ? 'Două magazine în Chișinău — Atrium și Eminescu 56 — și livrare în toată Moldova. Produse originale Victoria\'s Secret, Bath & Body Works, PINK, Kiko Milano.'
      : 'Secret Room — оригинальная продукция Victoria\'s Secret и Bath & Body Works в Молдове. Парфюмы, косметика, бельё. Быстрая доставка по всей стране.');
    this.metaService.updateKeywords('Secret Room Moldova, despre noi, Victoria\'s Secret, Bath & Body Works, parfumuri originale, Chișinău, оригинальная продукция');
    this.metaService.updateImage('https://secretroom.md/assets/images/SR-transparent.png');
  }
}
