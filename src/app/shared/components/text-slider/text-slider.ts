import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-text-slider',
  imports: [],
  templateUrl: './text-slider.html',
  styleUrl: './text-slider.scss'
})
export class TextSlider {
  @Input() text: string[] = ['🔥 Распродажа!', '🚚 Доставка за 24ч', '🎁 Подарки каждому', '💄 Косметика топ брендов'];

}
