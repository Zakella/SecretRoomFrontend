import {Injectable, signal} from '@angular/core';

@Injectable({providedIn: 'root'})
export class LoaderService {
  private loadingMap = signal<Record<string, boolean>>({});

  isLoading(zone: string = 'global') {
    return this.loadingMap()[zone] ?? false;
  }

  show(zone: string = 'global') {
    this.loadingMap.update((map) => ({ ...map, [zone]: true }));
  }

  hide(zone: string = 'global') {
    this.loadingMap.update((map) => ({ ...map, [zone]: false }));
  }
}
