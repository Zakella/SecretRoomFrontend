import {inject, Injectable, signal} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {environment} from '../../../environments/environment';
import {Observable} from 'rxjs';
import {GetResponse} from '../../entities/get-response';
import {CarouselImage} from '../../entities/carousel-image';
import {Product} from '../../entities/product';

class Products {
}

@Injectable({
  providedIn: 'root',
})
export class HeroService {
  private http = inject(HttpClient);
  private baseUrL = environment.apiUrl + "heroSections";
  heroId = signal<number>(0)

  getActiveHeroItems(): Observable<CarouselImage[]> {
    return this.http.get<CarouselImage[]>(`${this.baseUrL}/active`);
  }

  getHeroProductsById(): Observable<Products[]> {
    return this.http.get<Product[]>(`${this.baseUrL}/${this.heroId()}/products`);
  }
}
