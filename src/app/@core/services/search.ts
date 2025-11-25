import {inject, Injectable, signal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {ActivatedRoute} from '@angular/router';

@Injectable({providedIn: 'root'})
export class SearchService {
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  query = signal('');
  suggestions = signal<any[]>([]);
  loading = signal(false);
  private timeoutId: any;
  private abortCtrl: AbortController | null = null;

}
