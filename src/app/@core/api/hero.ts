import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {GetResponse} from '../../entities/get-response';
import {CarouselImage} from '../../entities/carousel-image';

@Injectable({
  providedIn: 'root',
})
export class HeroService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "heroSections";

  getActiveHeroItems(): Observable<CarouselImage[]> {
    return this.http.get<CarouselImage[]>(`${this.baseUrL}/active`);
  }
}
