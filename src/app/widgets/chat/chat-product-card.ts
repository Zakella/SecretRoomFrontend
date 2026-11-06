import {ChangeDetectionStrategy, Component, computed, input, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {ProductPrice} from '../../shared/components/product/product-price/product-price';

export const CHAT_NO_IMAGE = 'assets/images/no-image.png';

/** What a product card in the chat shows (from a PRODUCT message or the draft). */
export interface ChatProductCardView {
  name: string;
  price: number | null;
  oldPrice: number | null;
  /** Only an http(s) address, otherwise null (placeholder). */
  imageUrl: string | null;
  /** Internal route of the product page; null — not clickable. */
  link: string[] | null;
}

/** Address of a product photo: http(s) only (absolute or relative to the site), anything else — null. */
export function safeImageUrl(url: string | null | undefined, base: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, base);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

/** SR-220: product card in the chat window — photo, name, price (old one struck through), link to the product. */
@Component({
  selector: 'app-chat-product-card',
  imports: [RouterLink, ProductPrice],
  template: `
    @let c = card();
    @if (c.link) {
      <a class="chat-pc chat-pc--link" [routerLink]="c.link">
        <img class="chat-pc__img" [src]="src()" [alt]="c.name" loading="lazy" width="48" height="60" (error)="onImageError()">
        <span class="chat-pc__body">
          <span class="chat-pc__name">{{ c.name }}</span>
          @if (c.price !== null) {
            <product-price [price]="c.price" [oldPrice]="c.oldPrice" size="sm"/>
          }
        </span>
      </a>
    } @else {
      <div class="chat-pc">
        <img class="chat-pc__img" [src]="src()" [alt]="c.name" loading="lazy" width="48" height="60" (error)="onImageError()">
        <span class="chat-pc__body">
          <span class="chat-pc__name">{{ c.name }}</span>
          @if (c.price !== null) {
            <product-price [price]="c.price" [oldPrice]="c.oldPrice" size="sm"/>
          }
        </span>
      </div>
    }
  `,
  styleUrl: './chat-product-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatProductCard {
  readonly card = input.required<ChatProductCardView>();
  private readonly failed = signal(false);

  readonly src = computed(() => (this.failed() ? CHAT_NO_IMAGE : this.card().imageUrl || CHAT_NO_IMAGE));

  /** Broken photo → placeholder (once: no loop if the placeholder fails too). */
  onImageError(): void {
    this.failed.set(true);
  }
}
