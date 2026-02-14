import {ChangeDetectionStrategy, Component, HostListener, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';

interface ChatMessage {
  user: 'user' | 'support';
  text: string;
}
@Component({
  selector: 'app-chat',
  imports: [
    FormsModule
  ],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  chatOpen = signal(false);
  messages = signal<ChatMessage[]>([]);
  newMessage = '';

  toggleChat() {
    this.chatOpen.update(open => !open);
  }

  sendMessage() {
    const text = this.newMessage.trim();
    if (!text) return;

    // Добавляем сообщение пользователя
    this.messages.update(msgs => [...msgs, { user: 'user', text }]);
    this.newMessage = '';

    // Симуляция ответа поддержки через 1 секунду
    setTimeout(() => {
      this.messages.update(msgs => [...msgs, { user: 'support', text: 'Спасибо! Мы скоро ответим.' }]);
    }, 1000);
  }
}
