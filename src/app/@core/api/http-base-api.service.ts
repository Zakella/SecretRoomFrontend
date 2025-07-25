import { HttpClient } from '@angular/common/http';
import { BaseApi } from './base-api.abstract';
import { Observable } from 'rxjs';

export abstract class HttpBaseApi<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> extends BaseApi<T, CreateDto, UpdateDto> {
  protected constructor(
    protected readonly http: HttpClient,
    protected readonly baseUrl: string
  ) {
    super();
  }

  getAll(): Observable<T[]> {
    return this.http.get<T[]>(this.baseUrl);
  }

  getById(id: string): Observable<T> {
    return this.http.get<T>(`${this.baseUrl}/${id}`);
  }

  create(data: CreateDto): Observable<T> {
    return this.http.post<T>(this.baseUrl, data);
  }

  update(id: string, data: UpdateDto): Observable<T> {
    return this.http.put<T>(`${this.baseUrl}/${id}`, data);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
