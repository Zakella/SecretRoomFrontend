import {ChangeDetectionStrategy, Component, inject, ViewEncapsulation} from '@angular/core';
import {DialogModule} from 'primeng/dialog';
import {ButtonModule} from 'primeng/button';
import {InputTextModule} from 'primeng/inputtext';
import {TooltipModule} from 'primeng/tooltip';
import {ShareLinkService} from '../../../../@core/services/share-link-service';
import {Language} from '../../../../@core/services/language';

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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShareModal {
  visible = false;
  shareService = inject(ShareLinkService);
  private langService = inject(Language);
  activeLang = this.langService.currentLanguage;
  shareUrl = '';

  public open(): void {
    this.shareUrl = this.shareService.createShareableLink();
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
