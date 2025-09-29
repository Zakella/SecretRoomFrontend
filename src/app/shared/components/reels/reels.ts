import {Component, signal} from '@angular/core';

@Component({
  selector: 'app-reels',
  imports: [],
  templateUrl: './reels.html',
  styleUrl: './reels.scss'
})
export class Reels{
  prizes = [
    'Скидка 10%',
    'Бесплатная доставка',
    'Скидка 20%',
    'Купон 100 MDL',
    'Сюрприз 🎁',
    'Повтори попытку'
  ];

  spinning = signal(false);
  selectedPrize: string | null = null;
  rotation = 0;
  isSelected = signal(false);

  spinWheel() {
    if (this.spinning()) return;

    this.spinning.set(true);
    this.selectedPrize = null;
    this.isSelected.set(false);

    const rounds = 9;
    const prizeIndex = Math.floor(Math.random() * this.prizes.length);
    const degreesPerPrize = 360 / this.prizes.length;

    const randomOffset = degreesPerPrize / 2;
    this.rotation = rounds * 360 + prizeIndex * degreesPerPrize + randomOffset;

    setTimeout(() => {
      this.selectedPrize = this.prizes[prizeIndex];
      this.isSelected.set(true);
      this.spinning.set(false);
    }, 4000);
  }
}
