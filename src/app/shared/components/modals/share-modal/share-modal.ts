import {Component, inject, ViewEncapsulation} from '@angular/core';
import {DialogModule} from 'primeng/dialog';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TooltipModule} from 'primeng/tooltip';
import {ShareLinkService} from '../../../../@core/services/share-link-service';

@Component({
  selector: 'app-share-modal',
  imports: [
    DialogModule,
    ButtonModule,
    InputTextModule,
    TooltipModule
  ],
  providers: [ShareLinkService],
  templateUrl: './share-modal.html',
  styleUrl: './share-modal.scss',
  encapsulation: ViewEncapsulation.None,
})
export class ShareModal {
  visible = false;
  shareService = inject(ShareLinkService);
  shareUrl = this.shareService.createShareableLink();

  public open(): void {
    this.visible = true;
  }

  protected copyLink(): void {
    this.shareService.copyLinkToClipboard();
    this.visible = false;
  }

  protected shareToTelegram(): void {
    this.shareService.shareToTelegram();
    this.visible = false;
  }

  protected shareToWhatsApp(): void {
    this.shareService.shareToWhatsApp();
    this.visible = false;
  }
}
