import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {Product} from '../../../entities/product';
import {Language} from '../../../@core/services/language';
import {ChatAsk, ChatProductDraft} from '../chat-ask';

function finiteOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Draft card of a product page product; null — nothing to ask about (no valid id). */
export function productDraftOf(product: Product | null | undefined, lang: string): ChatProductDraft | null {
  if (!product) return null;
  // the product URL id is the webstore appId ("API отдаёт id карточки, appId у товара пуст")
  const productId = Number(product.appId || product.id);
  if (!Number.isSafeInteger(productId) || productId <= 0) return null;
  const localized = lang === 'ru' ? product.nameRu : product.nameRo;
  const name = (localized || product.name || '').trim();
  return {
    productId,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    price: finiteOrNull(product.price),
    oldPrice: finiteOrNull(product.oldPrice),
    imageUrl: product.imageURL || product.productImagesWebStore?.[0]?.imageUrl || null,
  };
}

/**
 * SR-220: "Ask in chat" on the product page. Hands the product to the chat widget through ChatAsk and nothing else:
 * no browser APIs, so it renders the same on the server. Gone once the chat is switched off (widget got 404).
 */
@Component({
  selector: 'app-ask-in-chat',
  imports: [TranslocoPipe],
  template: `
    @if (visible()) {
      <button type="button" class="ask-in-chat" (click)="askInChat()">
        <i class="ri-chat-3-line" aria-hidden="true"></i>
        <span>{{ 'chat.askInChat' | transloco }}</span>
      </button>
    }
  `,
  styleUrl: './ask-in-chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AskInChat {
  readonly product = input<Product | null>(null);
  private chatAsk = inject(ChatAsk);
  private lang = inject(Language);

  readonly draft = computed(() => productDraftOf(this.product(), this.lang.currentLanguage()));
  readonly visible = computed(() => this.chatAsk.available() && this.draft() !== null);

  askInChat(): void {
    const draft = this.draft();
    if (draft) this.chatAsk.ask(draft);
  }
}
