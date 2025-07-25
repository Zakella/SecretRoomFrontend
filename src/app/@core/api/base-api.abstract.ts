import { Observable } from 'rxjs';

export abstract class BaseApi<T, CreateDto = Partial<T>, UpdateDto = Partial<T>> {
  abstract getAll(): Observable<T[]>;
  abstract getById(id: string): Observable<T>;
  abstract create(data: CreateDto): Observable<T>;
  abstract update(id: string, data: UpdateDto): Observable<T>;
  abstract delete(id: string): Observable<void>;
}
