import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {environment} from '../../../environments/environment';

export interface InstagramMedia {
  id: string;
  caption: string | null;
  mediaType: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  mediaUrl: string;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
  likeCount: number | null;
  commentsCount: number | null;
}

// Интерфейс для ответа API (snake_case)
export interface InstagramMediaRaw {
  id: string;
  caption: string | null;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  media_url: string;
  thumbnail_url: string | null;
  permalink: string;
  timestamp: string;
  like_count: number | null;
  comments_count: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class InstagramService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl + 'instagram';

  getFeed(limit: number = 12): Observable<InstagramMedia[]> {
    const params = new HttpParams().set('limit', limit);
    return this.http.get<InstagramMediaRaw[]>(`${this.baseUrl}/feed`, {params}).pipe(
      map(items => items.map(this.mapToInstagramMedia))
    );
  }

  getMedia(mediaId: string): Observable<InstagramMedia> {
    return this.http.get<InstagramMediaRaw>(`${this.baseUrl}/media/${mediaId}`).pipe(
      map(this.mapToInstagramMedia)
    );
  }

  private mapToInstagramMedia(raw: InstagramMediaRaw): InstagramMedia {
    return {
      id: raw.id,
      caption: raw.caption,
      mediaType: raw.media_type,
      mediaUrl: raw.media_url,
      thumbnailUrl: raw.thumbnail_url,
      permalink: raw.permalink,
      timestamp: raw.timestamp,
      likeCount: raw.like_count,
      commentsCount: raw.comments_count
    };
  }
}