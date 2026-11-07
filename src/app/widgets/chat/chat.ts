import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  HostListener,
  inject,
  Injector,
  NgZone,
  PLATFORM_ID,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import {DOCUMENT, isPlatformBrowser} from '@angular/common';
import {NavigationEnd, Router} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {filter, Subscription} from 'rxjs';
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
  ChatMessageType,
  chatMessageType,
  ChatPollResponse,
  ChatProduct,
  ChatSendBody,
  isChatDisabled,
} from './chat-api';
import {isBotNavigator, newUuid, SiteTracker, TRACKER_NAVIGATOR} from '../../@core/api/site-tracker';
import {Language} from '../../@core/services/language';
import {Slugify} from '../../@core/services/slugify';
import {ChatAsk, ChatProductDraft} from './chat-ask';
import {CHAT_HINT_DELAY_MS, isChatHintSnoozed, isCheckoutUrl, snoozeChatHint} from './chat-hint';
import {ChatTextPart, splitLinks} from './chat-links';
import {ChatProductCard, ChatProductCardView, safeImageUrl} from './chat-product-card';

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

/** Staff picture as webstore stores it (contract: 1…2048 px per side). */
const CHAT_IMAGE_MAX_SIDE = 2048;

/** Staff picture of a message: loading → blob URL, or failed (placeholder). */
export interface ChatImageState {
  url: string | null;
  failed: boolean;
}

/** A message ready for the template: type resolved, text cut into text/link parts. */
export interface ChatMessageView {
  m: ChatMessage;
  type: ChatMessageType;
  parts: ChatTextPart[];
  attachmentId: string | null;
  /** CSS aspect-ratio of the picture (space reserved before it loads), null — unknown. */
  ratio: string | null;
  card: ChatProductCardView | null;
}

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
  imports: [TranslocoPipe, ChatProductCard],
  templateUrl: './chat.html',
  styleUrl: './chat.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Chat {
  private api = inject(ChatApi);
  private tracker = inject(SiteTracker);
  private lang = inject(Language);
  private slugify = inject(Slugify);
  private ask = inject(ChatAsk);
  private router = inject(Router);
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
  /** The hint delay has passed. */
  private readonly hintDue = signal(false);
  /** The hint was dismissed or the chat was opened less than 24 h ago. */
  private readonly hintSnoozed = signal(false);
  /** Current page is the checkout: nothing may distract from paying. */
  private readonly onCheckout = signal(false);
  /** "Have a question?" bubble next to the closed button. */
  readonly showHint = computed(() =>
    this.hintDue() && !this.hintSnoozed() && !this.open() && !this.onCheckout() && this.visible());
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

  /** SR-220: "you are asking about…" card above the input; sent as a PRODUCT message. */
  readonly productDraft = signal<ChatProductDraft | null>(null);
  /** Staff pictures by attachmentId, for the lifetime of the widget. */
  readonly images = signal<Readonly<Record<string, ChatImageState>>>({});
  /** Blob URL of the picture shown large over the window. */
  readonly zoomed = signal<string | null>(null);

  readonly view = computed(() => this.messages().map(m => this.toView(m)));
  readonly draftCard = computed(() => {
    const p = this.productDraft();
    return p ? this.cardOf(p) : null;
  });
  readonly canSend = computed(() => !this.sending() && (!!this.draft().trim() || this.productDraft() !== null));

  readonly unreadBadge = computed(() => (this.unread() > 9 ? '9+' : String(this.unread())));
  /** After the auto-reply (a SYSTEM message) and without a phone — the compact phone form. */
  readonly showPhoneForm = computed(() =>
    !this.hasPhone() && !this.contactDone() && this.messages().some(m => m.author === 'SYSTEM'));

  private readonly list = viewChild<ElementRef<HTMLElement>>('list');
  private readonly input = viewChild<ElementRef<HTMLTextAreaElement>>('input');
  private readonly zoomClose = viewChild<ElementRef<HTMLButtonElement>>('zoomClose');
  /** The preview the large picture was opened from: focus goes back to it on close. */
  private zoomOrigin: HTMLElement | null = null;

  private chatKey: string | null = null;
  private cursor = 0;
  private readSent = 0;
  private readInFlight = false;
  /** Last failed message: "Retry" (or sending the same text) reuses its clientMessageId. */
  private pending: {clientMessageId: string; text: string; productId: number | null} | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pollSub: Subscription | null = null;
  private polling = false;
  private destroyed = false;
  private headerObserver: ResizeObserver | null = null;
  private hintTimer: ReturnType<typeof setTimeout> | null = null;
  /** Picture requests in flight (finished ones drop out by themselves). */
  private readonly imageSubs = new Subscription();

  constructor() {
    if (!this.isBrowser) return;
    if (this.isBot) {
      // no widget for bots — no "Ask in chat" either
      this.ask.disable();
      return;
    }
    this.chatKey = this.readKey();
    const onVisibility = () => this.onVisibilityChange();
    const onStorage = (event: StorageEvent) => this.onStorage(event);
    this.onCheckout.set(isCheckoutUrl(this.router.url));
    const routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.onCheckout.set(isCheckoutUrl(e.urlAfterRedirects)));
    this.zone.runOutsideAngular(() => {
      this.hintTimer = setTimeout(() => {
        this.hintTimer = null;
        // read late: another tab may have snoozed it meanwhile
        this.hintSnoozed.set(isChatHintSnoozed(this.storage(), Date.now()));
        this.hintDue.set(true);
      }, CHAT_HINT_DELAY_MS);
    });
    this.document.addEventListener('visibilitychange', onVisibility);
    this.document.defaultView?.addEventListener('storage', onStorage);
    inject(DestroyRef).onDestroy(() => {
      this.destroyed = true;
      this.clearTimer();
      if (this.hintTimer !== null) clearTimeout(this.hintTimer);
      routerSub.unsubscribe();
      this.pollSub?.unsubscribe();
      this.unwatchHeader();
      this.releaseImages();
      this.document.removeEventListener('visibilitychange', onVisibility);
      this.document.defaultView?.removeEventListener('storage', onStorage);
    });
    // "Ask in chat" pressed before or after the widget appeared: the request waits in the service until taken here
    effect(() => {
      if (this.ask.request()) untracked(() => this.takeAsk());
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
    this.snoozeHint();
    this.watchHeader();
    this.markRead();
    this.loadImages();
    this.schedule();
    this.afterRender(() => {
      this.scrollToBottom();
      this.input()?.nativeElement.focus();
    });
  }

  /** Cross on the hint bubble: quiet for 24 h. */
  dismissHint(): void {
    this.snoozeHint();
  }

  close(): void {
    this.zoomed.set(null);
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
    const product = this.productDraft();
    if ((!text && !product) || this.sending()) return;
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
    const productId = product?.productId ?? null;
    if (!this.pending || this.pending.text !== text || this.pending.productId !== productId) {
      this.pending = {clientMessageId: newUuid(), text, productId};
    }
    const clientMessageId = this.pending.clientMessageId;
    // the first message of either type creates the conversation key
    const key = this.ensureKey();
    this.sending.set(true);
    this.error.set(null);
    const body: ChatSendBody = {
      clientMessageId,
      // TEXT goes without `type`, exactly as before SR-220
      ...(productId !== null ? {type: 'PRODUCT' as const, productId} : {}),
      text,
      name: trimmedOrNull(this.name(), CHAT_NAME_MAX),
      phone,
      language: this.lang.currentLanguage() === 'ru' ? 'ru' : 'ro',
      visitorId: this.tracker.consentedVisitorId() ?? null,
      pageUrl: this.pageUrl(),
      website: this.website(),
    };
    this.api.send(key, body).subscribe({
      next: res => {
        this.sending.set(false);
        if (this.pending?.clientMessageId === clientMessageId) this.pending = null;
        // the visitor may have typed more while sending — clear only what was sent
        if (this.draft().trim() === text) this.draft.set('');
        if (productId !== null && this.productDraft()?.productId === productId) this.productDraft.set(null);
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
        // hidden or gone from the catalog: drop the card, the typed text stays
        if (kind === 'productNotFound' && this.productDraft()?.productId === productId) this.productDraft.set(null);
      },
    });
  }

  /** Cross on the draft card. */
  removeProduct(): void {
    this.productDraft.set(null);
    const e = this.error();
    if (e === 'productNotFound' || e === 'badType') this.error.set(null);
    this.input()?.nativeElement.focus();
  }

  zoom(url: string): void {
    const active = this.document.activeElement;
    // Safari does not focus a clicked button: then the input gets the focus back
    this.zoomOrigin = active instanceof HTMLElement && this.list()?.nativeElement.contains(active) ? active : null;
    this.zoomed.set(url);
    this.afterRender(() => this.zoomClose()?.nativeElement.focus());
  }

  closeZoom(): void {
    if (this.zoomed() === null) return;
    const origin = this.zoomOrigin;
    this.zoomOrigin = null;
    this.zoomed.set(null);
    this.afterRender(() => (origin?.isConnected ? origin : this.input()?.nativeElement)?.focus());
  }

  /** Esc closes the large picture wherever the focus is (a click on the picture leaves it on body); the window stays. */
  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.zoomed() !== null) this.closeZoom();
  }

  /** A click on the backdrop closes, a click on the picture itself does not. */
  onZoomBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeZoom();
  }

  /** Esc in the window: the large picture first, then the window. */
  onEscape(): void {
    if (this.zoomed() !== null) this.closeZoom();
    else this.close();
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

  private toView(m: ChatMessage): ChatMessageView {
    const type = chatMessageType(m);
    const image = type === 'IMAGE' ? m.image! : null;
    const w = Number(image?.width);
    const h = Number(image?.height);
    const ratio = image && w >= 1 && h >= 1 && w <= CHAT_IMAGE_MAX_SIDE && h <= CHAT_IMAGE_MAX_SIDE ? `${w} / ${h}` : null;
    return {
      m,
      type,
      parts: splitLinks(m.text),
      attachmentId: image?.attachmentId ?? null,
      ratio,
      card: type === 'PRODUCT' ? this.cardOf(m.product!) : null,
    };
  }

  /** Link is always an internal route built from productId (never the address from the message). */
  private cardOf(p: ChatProduct | ChatProductDraft): ChatProductCardView {
    const id = Number(p.productId);
    const name = typeof p.name === 'string' ? p.name : '';
    const lang = this.lang.currentLanguage() === 'ru' ? 'ru' : 'ro';
    return {
      name,
      price: typeof p.price === 'number' && Number.isFinite(p.price) ? p.price : null,
      oldPrice: typeof p.oldPrice === 'number' && Number.isFinite(p.oldPrice) ? p.oldPrice : null,
      imageUrl: safeImageUrl(p.imageUrl, this.document.baseURI),
      link: Number.isSafeInteger(id) && id > 0 ? this.slugify.productUrl(lang, String(id), name) : null,
    };
  }

  private takeAsk(): void {
    const product = this.ask.take();
    if (!product || !this.enabled()) return;
    this.productDraft.set(product);
    const e = this.error();
    if (e === 'productNotFound' || e === 'badType') this.error.set(null);
    if (this.open()) this.afterRender(() => this.input()?.nativeElement.focus());
    else this.toggle();
  }

  /** Pictures of the loaded messages, only while the window is open; each one once per widget lifetime. */
  private loadImages(): void {
    const key = this.chatKey;
    if (!key || !this.open() || this.destroyed) return;
    const known = this.images();
    for (const v of this.view()) {
      const id = v.attachmentId;
      if (id && !known[id]) this.loadImage(key, id);
    }
  }

  private loadImage(key: string, id: string): void {
    this.setImage(id, {url: null, failed: false});
    this.imageSubs.add(this.api.attachment(key, id).subscribe({
      next: blob => {
        if (this.destroyed) return;
        // webstore sends image/jpeg or image/png; anything else (an HTML error page…) is not shown
        const URLs = this.document.defaultView?.URL;
        if (!blob?.type.startsWith('image/') || !URLs?.createObjectURL) {
          this.setImage(id, {url: null, failed: true});
          return;
        }
        this.setImage(id, {url: URLs.createObjectURL(blob), failed: false});
      },
      error: () => {
        // own 404 NOT_FOUND / network: a placeholder; chat-off is noticed by the regular poll
        this.setImage(id, {url: null, failed: true});
      },
    }));
  }

  private setImage(id: string, state: ChatImageState): void {
    this.images.update(all => ({...all, [id]: state}));
  }

  /** Blob URLs live as long as the widget. */
  private releaseImages(): void {
    this.imageSubs.unsubscribe();
    const URLs = this.document.defaultView?.URL;
    for (const state of Object.values(this.images())) {
      if (state.url) URLs?.revokeObjectURL(state.url);
    }
    this.images.set({});
    this.zoomed.set(null);
  }

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
    this.loadImages();
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
    this.zoomed.set(null);
    this.productDraft.set(null);
    this.ask.disable();
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

  private storage(): Storage | null {
    try {
      return this.document.defaultView?.localStorage ?? null;
    } catch {
      return null;
    }
  }

  private snoozeHint(): void {
    this.hintSnoozed.set(true);
    snoozeChatHint(this.storage(), Date.now());
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
