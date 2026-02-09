import { Injectable } from '@angular/core';

declare var gtag: any;

@Injectable({
  providedIn: 'root'
})
export class GoogleAnalytics {
  public sendPageView(url: string): void {
    if (typeof gtag !== 'undefined') {
      gtag('event', 'page_view', {
        page_path: url
      });
    }
  }

  send(data: GaEventData) {
    if (typeof gtag !== 'function') {
      console.warn('Google Analytics is not loaded!');
      return;
    }

    gtag('event', data.event, {
      event_category: data.category,
      event_label: data.label,
      value: data.value
    });
  }

  grantConsent() {
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      'ad_storage': 'granted',
      'analytics_storage': 'granted'
    });
  }

  denyConsent() {
    if (typeof gtag !== 'function') return;
    gtag('consent', 'update', {
      'ad_storage': 'denied',
      'analytics_storage': 'denied'
    });
  }
}

export interface GaEventData {
  event: string;
  category?: string;
  label?: string;
  value?: number;
}
