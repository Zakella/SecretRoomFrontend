import {Injectable, signal} from '@angular/core';
import {BehaviorSubject} from 'rxjs';

export interface Review {
  id: number;
  author: string;
  rating: number;
  comment: string;
  date: Date;
}
@Injectable({
  providedIn: 'root'
})
export class ReviewsApi {
  private _reviews = signal<Review[]>([
    {
      id: 1,
      author: 'Мария',
      rating: 5,
      comment: 'Отличный продукт, пользуюсь каждый день!',
      date: new Date('2025-08-01')
    },
    {
      id: 2,
      author: 'Анна',
      rating: 4,
      comment: 'Хорошо увлажняет, но запах на любителя.',
      date: new Date('2025-08-05')
    }
  ]);

  reviews = this._reviews.asReadonly();

  addReview(review: Omit<Review, 'id' | 'date'>) {
    const newReview: Review = {
      id: Date.now(),
      date: new Date(),
      ...review
    };
    this._reviews.update((list) => [newReview, ...list]);
  }
}
