import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ShareLinkService {

  public createShareableLink(): string {
    return window.location.href;
  }

  public copyLinkToClipboard(): void {
    const link = this.createShareableLink();

    if (this.isClipboardApiAvailable()) {
      this.copyUsingClipboardApi(link);
    } else {
      this.copyUsingFallback(link);
    }
  }

  public shareToTelegram(): void {
    const link = encodeURIComponent(this.createShareableLink());
    window.open(`https://t.me/share/url?url=${link}`, '_blank');
  }



  private isClipboardApiAvailable(): boolean {
    return !!navigator.clipboard;
  }

  private copyUsingClipboardApi(link: string): void {
    navigator.clipboard.writeText(link)
      .then(() => console.log('Ссылка скопирована через Clipboard API!'))
      .catch(err => console.error('Ошибка копирования через Clipboard API: ', err));
  }


  private copyUsingFallback(link: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      console.log('Ссылка скопирована через fallback!');
    } catch (err) {
      console.error('Ошибка копирования через fallback: ', err);
    }

    document.body.removeChild(textArea);
  }
}
