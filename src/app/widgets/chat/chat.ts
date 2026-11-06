import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  NgZone,
  PLATFORM_ID,
  signal,
  viewChild,
} from '@angular/core';
import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {TranslocoPipe} from '@ngneat/transloco';
import {Subscription} from 'rxjs';
import {
  CHAT_MAX_LENGTH,
  CHAT_NAME_MAX,
  CHAT_PAGE_URL_MAX,
  CHAT_PHONE_MAX,
  CHAT_PHONE_RE,
  ChatApi,
  ChatErrorKind,
  chatErrorKind,
  ChatMessage,
  ChatPollResponse,
  isChatDisabled,
} from './chat-api';
import {isBotNavigator, newUuid, SiteTracker, TRACKER_NAVIGATOR} from '../../@core/api/site-tracker';
import {Language} from '../../@core/services/language';

/** SR-218: chatKey of this browser. Needed for the chat to work, so it does not depend on cookie_consent. */
export const CHAT_KEY_STORAGE = 'sr_chat_id';
/** Window open and tab visible. */
export const CHAT_POLL_OPEN_MS = 4_000;
/** Window closed, a conversation exists ("they answered" indicator). */
export const CHAT_POLL_CLOSED_MS = 30_000;

/**
 * Fixed desktop header of the site. Its own stacking context (z-index 1000, same as the cart drawer that must stay
 * above the chat) covers the window, so the open window keeps below its bottom edge instead of going over it.
 */
export const SITE_HEADER_SELECTOR = 'app-header .header';
/** Gap between the header and the open window. */
export const CHAT_TOP_GAP = 12;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trimmedOrNull(value: string, max: number): string | null {
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * Chat with the shop (contract docs/contracts/sr-218-chat.md, "Сайт (виджет)").
 * Browser only; text is shown by interpolation only (never innerHTML). Polling, not SSE.
 */
@Component({
  selector: 'app-chat',
  imports: [TranslocoPipe],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  private api = inject(ChatApi);
  private tracker = inject(SiteTracker);
  private lang = inject(Language);
  private zone = inject(NgZone);
  private injector = inject(Injector);
  private document = inject(DOCUMENT);
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly nav = inject(TRACKER_NAVIGATOR);
  /** Bots get 403 BOT from webstore anyway; only the user agent counts, as on the server (not navigator.webdriver). */
  private readonly isBot = isBotNavigator(this.nav ? {userAgent: this.nav.userAgent} : undefined);

  protected readonly maxLength = CHAT_MAX_LENGTH;
  protected readonly nameMax = CHAT_NAME_MAX;
  protected readonly phoneMax = CHAT_PHONE_MAX;

  /** false after a 404 (chat switched off) — the button disappears. */
  readonly enabled = signal(true);
  readonly visible = computed(() => this.isBrowser && !this.isBot && this.enabled());
  readonly open = signal(false);
  readonly messages = signal<ChatMessage[]>([]);
  readonly unread = signal(0);
  readonly hasPhone = signal(false);
  /** Px from the top of the viewport the open window must stay below (header bottom + gap); null — CSS default. */
  readonly topReserve = signal<number | null>(null);

  readonly draft = signal('');
  readonly name = signal('');
  readonly phone = signal('');
  readonly website = signal('');
  readonly introOpen = signal(false);
  readonly sending = signal(false);
  readonly error = signal<ChatErrorKind | null>(null);

  readonly contactPhone = signal('');
  readonly contactSending = signal(false);
  readonly contactError = signal<ChatErrorKind | null>(null);
  readonly contactDone = signal(false);

  readonly unreadBadge = computed(() => (this.unread() > 9 ? '9+' : String(this.unread())));
  /** After the auto-reply (a SYSTEM message) and without a phone — the compact phone form. */
  readonly showPhoneForm = computed(() =>
    !this.hasPhone() && !this.contactDone() && this.messages().some(m => m.author === 'SYSTEM'));

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');

  private chatKey: string | null = null;
  private cursor = 0;
  private readSent = 0;
  private readInFlight = false;
  /** Last failed message: "Retry" (or sending the same text) reuses its clientMessageId. */
  private pending: {clientMessageId: string; text: string} | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;
  private polling = false;
  private destroyed = false;
  private headerObserver: ResizeObserver | null = null;

  constructor() {
    if (!this.isBrowser || this.isBot) return;
    this.chatKey = this.readKey();
    const onVisibility = () => this.onVisibilityChange();
    const onStorage = (event: StorageEvent) => this.onStorage(event);
    this.document.addEventListener('visibilitychange', onVisibility);
    this.document.defaultView?.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearTimer();
      this.pollSub?.unsubscribe();
      this.unwatchHeader();
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.document.defaultView?.removeEventListener('storage', onStorage);
    });
    // history on page load (GET after=0), then the regular polling
    if (this.chatKey) this.poll();
  }

  toggle(): void {
    if (this.open()) {
      this.close();
      return;
    }
    this.open.set(true);
    this.watchHeader();
    this.markRead();
    this.schedule();
    this.afterRender(() => {
      this.scrollToBottom();
      this.input()?.nativeElement.focus();
    });
  }

  close(): void {
    this.open.set(false);
    this.unwatchHeader();
    this.schedule();
  }

  onDraftInput(event: Event): void {
    this.draft.set((event.target as HTMLTextAreaElement).value);
    if (this.error() && this.error() !== 'notSent') this.error.set(null);
  }

  onFieldInput(field: 'name' | 'phone' | 'contactPhone' | 'website', event: Event): void {
    this[field].set((event.target as HTMLInputElement).value);
  }

  /** Enter sends, Shift+Enter is a line break (IME composition is left alone). */
  onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    this.send();
  }

  send(): void {
    const text = this.draft().trim();
    if (!text || this.sending()) return;
    if (text.length > CHAT_MAX_LENGTH) {
      this.error.set('tooLong');
      return;
    }
    const phone = trimmedOrNull(this.phone(), CHAT_PHONE_MAX);
    if (phone && !CHAT_PHONE_RE.test(phone)) {
      this.introOpen.set(true);
      this.error.set('badPhone');
      return;
    }
    if (!this.pending || this.pending.text !== text) this.pending = {clientMessageId: newUuid(), text};
    const clientMessageId = this.pending.clientMessageId;
    const key = this.ensureKey();
    this.sending.set(true);
    this.error.set(null);
    this.api.send(key, {
      clientMessageId,
      text,
      name: trimmedOrNull(this.name(), CHAT_NAME_MAX),
      phone,
      language: this.lang.currentLanguage() === 'ru' ? 'ru' : 'ro',
      visitorId: this.tracker.consentedVisitorId() ?? null,
      pageUrl: this.pageUrl(),
      website: this.website(),
    }).subscribe({
      next: res => {
        this.sending.set(false);
        if (this.pending?.clientMessageId === clientMessageId) this.pending = null;
        // the visitor may have typed more while sending — clear only what was sent
        if (this.draft().trim() === text) this.draft.set('');
        if (phone) this.hasPhone.set(true);
        this.merge([res.message, ...(res.autoReply ? [res.autoReply] : [])]);
        this.markRead();
        this.schedule();
      },
      error: err => {
        this.sending.set(false);
        if (isChatDisabled(err)) {
          this.disable();
          return;
        }
        const kind = chatErrorKind(err);
        this.error.set(kind);
        if (kind === 'badPhone') this.introOpen.set(true);
      },
    });
  }

  /** Same clientMessageId as the failed attempt: a request that reached webstore is not saved twice. */
  retry(): void {
    if (this.pending) this.draft.set(this.pending.text);
    this.send();
  }

  submitContact(): void {
    const phone = trimmedOrNull(this.contactPhone(), CHAT_PHONE_MAX);
    if (!this.chatKey || this.contactSending()) return;
    if (!phone || !CHAT_PHONE_RE.test(phone)) {
      this.contactError.set('badPhone');
      return;
    }
    this.contactSending.set(true);
    this.contactError.set(null);
    this.api.contact(this.chatKey, {name: trimmedOrNull(this.name(), CHAT_NAME_MAX), phone}).subscribe({
      next: () => {
        this.contactSending.set(false);
        this.contactDone.set(true);
        this.hasPhone.set(true);
      },
      error: err => {
        this.contactSending.set(false);
        if (isChatDisabled(err)) {
          this.disable();
          return;
        }
        this.contactError.set(chatErrorKind(err));
      },
    });
  }

  /** One request now (public for tests); the next one is scheduled when it completes. */
  poll(): void {
    this.clearTimer();
    const key = this.chatKey;
    if (!key || this.destroyed || !this.enabled() || this.polling) return;
    this.polling = true;
    this.pollSub = this.api.poll(key, this.cursor).subscribe({
      next: res => {
        this.polling = false;
        this.apply(res);
        this.schedule();
      },
      error: err => {
        this.polling = false;
        if (isChatDisabled(err)) {
          this.disable();
          return;
        }
        // network / 429 / 5xx: keep the dialogue, try again on the regular schedule
        this.schedule();
      },
    });
  }

  /** Delay of the next poll, null — no polling (no conversation, tab hidden, chat off). */
  nextPollDelay(): number | null {
    if (!this.chatKey || this.destroyed || !this.enabled() || this.isHidden()) return null;
    return this.open() ? CHAT_POLL_OPEN_MS : CHAT_POLL_CLOSED_MS;
  }

  protected isMine(m: ChatMessage): boolean {
    return m.author === 'CUSTOMER';
  }

  /** Local HH:mm; a bad date shows nothing instead of breaking the widget. */
  protected timeOf(m: ChatMessage): string {
    const d = new Date(m.createdAt);
    if (Number.isNaN(d.getTime())) return '';
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ---- internals ----

  private apply(res: ChatPollResponse): void {
    if (res.messages?.length) this.merge(res.messages);
    const unread = Math.max(0, res.unread ?? 0);
    this.unread.set(unread);
    // nothing unread on the server: everything loaded so far has been seen (here or in another tab)
    if (unread === 0) this.readSent = Math.max(this.readSent, this.cursor);
    this.hasPhone.set(res.hasPhone === true);
    this.markRead();
  }

  /** POST and polling may return the same message: dedup by messageId, order by seq; cursor = max seq. */
  private merge(incoming: ChatMessage[]): void {
    const byId = new Map(this.messages().map(m => [m.messageId, m]));
    let added = false;
    for (const m of incoming) {
      if (!m?.messageId || byId.has(m.messageId)) continue;
      byId.set(m.messageId, m);
      added = true;
      if (m.seq > this.cursor) this.cursor = m.seq;
    }
    if (!added) return;
    this.messages.set([...byId.values()].sort((a, b) => a.seq - b.seq));
    if (this.open()) this.afterRender(() => this.scrollToBottom());
  }

  /** Window open and tab visible: everything shown is read (other tabs go dark on their next poll). */
  private markRead(): void {
    const key = this.chatKey;
    if (!key || !this.open() || this.isHidden()) return;
    const seq = this.cursor;
    const lastReply = this.messages().reduce((max, m) => (m.author !== 'CUSTOMER' && m.seq > max ? m.seq : max), 0);
    if (seq <= 0 || this.readInFlight || (this.unread() === 0 && lastReply <= this.readSent)) return;
    this.readInFlight = true;
    this.api.read(key, seq).subscribe({
      next: () => {
        this.readInFlight = false;
        this.readSent = Math.max(this.readSent, seq);
        this.unread.set(0);
      },
      error: err => {
        this.readInFlight = false;
        if (isChatDisabled(err)) this.disable();
      },
    });
  }

  private schedule(): void {
    this.clearTimer();
    if (this.polling) return; // the running request schedules the next one
    const delay = this.nextPollDelay();
    if (delay === null) return;
    // outside the zone: a pending timer must not keep the app unstable; signals still refresh the view
    this.zone.runOutsideAngular(() => {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.poll();
      }, delay);
    });
  }

  private clearTimer(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private onVisibilityChange(): void {
    if (this.isHidden()) {
      this.clearTimer();
      return;
    }
    // back to the tab: one request right away
    this.poll();
  }

  /** Another tab sent the first message: pick up its key. */
  private onStorage(event: StorageEvent): void {
    if (event.key !== CHAT_KEY_STORAGE || this.chatKey) return;
    const key = this.readKey();
    if (!key) return;
    this.chatKey = key;
    this.poll();
  }

  private disable(): void {
    this.enabled.set(false);
    this.open.set(false);
    this.unwatchHeader();
    this.clearTimer();
  }

  /** While the window is open: follow the header height (it shrinks once the page is scrolled, grows back at the top). */
  private watchHeader(): void {
    this.unwatchHeader();
    const header = this.document.querySelector<HTMLElement>(SITE_HEADER_SELECTOR);
    if (!header) return;
    const measure = () => {
      const rect = header.getBoundingClientRect();
      // display:none on mobile (own mobile header) — the CSS default applies
      this.topReserve.set(rect.height > 0 ? Math.ceil(Math.max(0, rect.bottom)) + CHAT_TOP_GAP : null);
    };
    measure();
    const RO = this.document.defaultView?.ResizeObserver;
    if (!RO) return;
    this.headerObserver = new RO(() => measure());
    this.headerObserver.observe(header);
  }

  private unwatchHeader(): void {
    this.headerObserver?.disconnect();
    this.headerObserver = null;
  }

  private isHidden(): boolean {
    return this.document.visibilityState === 'hidden';
  }

  private readKey(): string | null {
    try {
      const v = this.document.defaultView?.localStorage.getItem(CHAT_KEY_STORAGE);
      return v && UUID_RE.test(v) ? v : null;
    } catch {
      return null;
    }
  }

  /** Created with the first sent message (not when the window opens). No storage — the chat lives in memory. */
  private ensureKey(): string {
    if (this.chatKey) return this.chatKey;
    const key = newUuid();
    this.chatKey = key;
    try {
      this.document.defaultView?.localStorage.setItem(CHAT_KEY_STORAGE, key);
    } catch {
      // private mode / blocked storage: keep it in memory
    }
    return key;
  }

  /** Page without the query string (it may carry utm/fbclid and other tokens). */
  private pageUrl(): string | null {
    const loc = this.document.defaultView?.location;
    if (!loc) return null;
    return `${loc.origin}${loc.pathname}`.slice(0, CHAT_PAGE_URL_MAX);
  }

  private scrollToBottom(): void {
    const el = this.list()?.nativeElement;
    if (el) el.scrollTop = el.scrollHeight;
  }

  private afterRender(fn: () => void): void {
    afterNextRender({write: fn}, {injector: this.injector});
  }
}
