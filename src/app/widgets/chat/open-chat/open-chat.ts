import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {TranslocoPipe} from '@ngneat/transloco';
import {ChatAsk} from '../chat-ask';

/**
 * SR-238: explicit "Write in chat" (Contacts page). Asks the chat widget to open its window through ChatAsk and
 * nothing else: no navigation, no browser APIs, so it renders the same on the server. Gone once the chat is off.
 */
@Component({
  selector: 'app-open-chat',
  imports: [TranslocoPipe],
  template: `
    @if (chatAsk.available()) {
      <div class="open-chat">
        <button type="button" class="open-chat__btn" (click)="chatAsk.open()">
          <i class="ri-chat-3-line" aria-hidden="true"></i>
          <span>{{ 'chat.contacts.button' | transloco }}</span>
        </button>
        <p class="open-chat__note">{{ 'chat.contacts.note' | transloco }}</p>
      </div>
    }
  `,
  styleUrl: './open-chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OpenChat {
  protected readonly chatAsk = inject(ChatAsk);
}
