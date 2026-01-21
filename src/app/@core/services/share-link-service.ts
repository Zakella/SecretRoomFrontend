import {inject, Injectable} from '@angular/core';
import {MessageService} from 'primeng/api';

@Injectable()
export class ShareLinkService {
  private notification = inject(MessageService);

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
    console.log(link)
    window.open(`https://t.me/share/url?url=${link}`, '_blank');
  }

  public shareToWhatsApp(): void {
    const link = encodeURIComponent(this.createShareableLink());
    console.log(link)
    window.open(`https://wa.me/?text=${link}`, '_blank');
  }


  private isClipboardApiAvailable(): boolean {
    return !!navigator.clipboard;
  }

  private copyUsingClipboardApi(link: string): void {
    navigator.clipboard.writeText(link)
      .then(() => this.onSuccess())
      .catch(() => this.showError());
  }


  private copyUsingFallback(link: string): void {
    const textArea = document.createElement('textarea');
    textArea.value = link;
    document.body.appendChild(textArea);
    textArea.select();

    try {
      document.execCommand('copy');
      this.onSuccess();
    } catch (err) {
      this.showError();
    }
    document.body.removeChild(textArea);
  }

  private onSuccess(summary?:string) {
    this.notification.add({
      severity: 'secondary',
      summary: 'Скопировано',
      detail: 'Операция выполнена успешно!',
    })
  }

  private showError() {
    this.notification.add({
      severity: 'error',
      summary: 'Ошибка',
      detail: 'Что-то пошло не так.',
    });
  }
}
