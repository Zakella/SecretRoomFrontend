import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {ReviewsApi} from '../../../../@core/services/reviews';

@Component({
  selector: 'app-reviews',
  imports: [
    DatePipe,
    FormsModule
  ],
  templateUrl: './reviews.html',
  styleUrl: './reviews.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Reviews {
  private reviewStore = inject(ReviewsApi);
  reviews = this.reviewStore.reviews;
  newComment = '';

  addReview() {
    const text = this.newComment.trim();
    if (!text) return;

    this.reviewStore.addReview({
      author: 'Новый пользователь', // фиксированное имя
      rating: 5,                    // фиксированный рейтинг
      comment: text
    });

    this.newComment = '';
  }
}
