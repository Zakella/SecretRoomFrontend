import {ComponentFixture, fakeAsync, TestBed, tick} from '@angular/core/testing';
import {PLATFORM_ID, signal} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting, TestRequest} from '@angular/common/http/testing';
import {provideRouter, Router} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {Chat, CHAT_KEY_STORAGE, CHAT_POLL_CLOSED_MS, CHAT_POLL_OPEN_MS, CHAT_TOP_GAP} from './chat';
import {ChatMessage, ChatPollResponse, ChatProduct, ChatSendBody, ChatSendResponse} from './chat-api';
import {ChatAsk, ChatProductDraft} from './chat-ask';
import {CHAT_HINT_DELAY_MS, CHAT_HINT_SNOOZE_MS, CHAT_HINT_STORAGE} from './chat-hint';
import {Language} from '../../@core/services/language';
import {TRACKER_ENABLED, TRACKER_NAVIGATOR, VISITOR_ID_KEY} from '../../@core/api/site-tracker';
import {environment} from '../../../environments/environment';

const HUMAN_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120 Safari/537.36';
const KEY = '0f8fad5b-d9cb-469f-a165-70867728950e';
const VISITOR = '7c9e6679-7425-40de-944b-e07fc1f90ae7';
const BASE = environment.apiUrl + 'v1/chat';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function msg(seq: number, author: ChatMessage['author'], text = `m${seq}`): ChatMessage {
  return {messageId: `id-${seq}`, seq, author, text, createdAt: '2026-11-06T10:15:00Z'};
}

describe('Chat widget (SR-218)', () => {
  let fixture: ComponentFixture<Chat>;
  let chat: Chat;
  let http: HttpTestingController;
  let visibility: DocumentVisibilityState;
  const el = () => fixture.nativeElement as HTMLElement;

  function setup(opts: {platform?: 'browser' | 'server'; ua?: string; beforeCreate?: () => void} = {}) {
    TestBed.configureTestingModule({
      imports: [Chat],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
        {provide: PLATFORM_ID, useValue: opts.platform ?? 'browser'},
        {provide: TRACKER_ENABLED, useValue: true},
        {provide: TRACKER_NAVIGATOR, useValue: {userAgent: opts.ua ?? HUMAN_UA, webdriver: false, sendBeacon: () => true}},
      ],
    });
    http = TestBed.inject(HttpTestingController);
    opts.beforeCreate?.();
    fixture = TestBed.createComponent(Chat);
    chat = fixture.componentInstance;
    fixture.detectChanges();
  }

  const launcher = () => el().querySelector<HTMLButtonElement>('.chat-launcher');
  const textarea = () => el().querySelector<HTMLTextAreaElement>('.chat-input__area')!;

  function openWindow() {
    launcher()!.click();
    fixture.detectChanges();
  }

  function type(text: string) {
    textarea().value = text;
    textarea().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function sendClick() {
    el().querySelector<HTMLButtonElement>('.chat-input__send')!.click();
    fixture.detectChanges();
  }

  function expectSend(): TestRequest {
    const req = http.expectOne(`${BASE}/messages`);
    expect(req.request.method).toBe('POST');
    return req;
  }

  function expectPoll(after: number): TestRequest {
    const req = http.expectOne(r => r.method === 'GET' && r.url === `${BASE}/messages`);
    expect(req.request.params.get('after')).toBe(String(after));
    return req;
  }

  function pollResponse(messages: ChatMessage[], unread = 0, hasPhone = false): ChatPollResponse {
    return {conversationId: 'conv-1', messages, unread, hasPhone};
  }

  beforeEach(() => {
    localStorage.clear();
    visibility = 'visible';
    spyOnProperty(document, 'visibilityState', 'get').and.callFake(() => visibility);
  });

  afterEach(() => {
    http?.verify();
    fixture?.destroy();
    localStorage.clear();
  });

  describe('hint bubble next to the button', () => {
    const hint = () => el().querySelector<HTMLElement>('.chat-hint');
    const hintText = () => el().querySelector<HTMLButtonElement>('.chat-hint__text');
    const hintClose = () => el().querySelector<HTMLButtonElement>('.chat-hint__close');

    function setupAt(url: string | null = null) {
      setup({
        beforeCreate: () => {
          const router = TestBed.inject(Router);
          router.resetConfig([{path: '**', children: []}]);
          if (url) {
            router.navigateByUrl(url);
            tick();
          }
        },
      });
    }

    function waitForHint() {
      tick(CHAT_HINT_DELAY_MS);
      fixture.detectChanges();
    }

    it('appears 5 s after the widget, not earlier', fakeAsync(() => {
      setupAt();
      tick(CHAT_HINT_DELAY_MS - 1);
      fixture.detectChanges();
      expect(hint()).toBeNull();
      tick(1);
      fixture.detectChanges();
      expect(hint()).not.toBeNull();
      expect(hintText()!.textContent!.trim()).toBe('chat.hint.text');
      expect(hintClose()!.getAttribute('aria-label')).toBe('chat.hint.close');
      expect(localStorage.getItem(CHAT_HINT_STORAGE)).toBeNull();
      fixture.destroy();
    }));

    it('the cross hides it, writes a 24 h snooze and does not open the chat', fakeAsync(() => {
      setupAt();
      waitForHint();
      const before = Date.now();
      hintClose()!.click();
      fixture.detectChanges();
      expect(hint()).toBeNull();
      expect(chat.open()).toBeFalse();
      expect(launcher()).not.toBeNull();
      const until = Number(localStorage.getItem(CHAT_HINT_STORAGE));
      expect(until).toBeGreaterThanOrEqual(before + CHAT_HINT_SNOOZE_MS);
      expect(until).toBeLessThanOrEqual(Date.now() + CHAT_HINT_SNOOZE_MS);
      fixture.destroy();
    }));

    it('a click on the bubble opens the chat and snoozes the hint', fakeAsync(() => {
      setupAt();
      waitForHint();
      hintText()!.click();
      fixture.detectChanges();
      expect(chat.open()).toBeTrue();
      expect(hint()).toBeNull();
      expect(Number(localStorage.getItem(CHAT_HINT_STORAGE))).toBeGreaterThan(Date.now());
      chat.close();
      fixture.detectChanges();
      expect(hint()).toBeNull();
      expect(launcher()).not.toBeNull();
      fixture.destroy();
    }));

    it('opening the chat with the button snoozes the hint, even before it showed up', fakeAsync(() => {
      setupAt();
      launcher()!.click();
      fixture.detectChanges();
      expect(Number(localStorage.getItem(CHAT_HINT_STORAGE))).toBeGreaterThan(Date.now());
      chat.close();
      waitForHint();
      expect(hint()).toBeNull();
      fixture.destroy();
    }));

    it('hidden while the snooze lasts, back after it expired', fakeAsync(() => {
      localStorage.setItem(CHAT_HINT_STORAGE, String(Date.now() + 60_000));
      setupAt();
      waitForHint();
      expect(hint()).toBeNull();
      fixture.destroy();

      localStorage.setItem(CHAT_HINT_STORAGE, String(Date.now() - 1));
      TestBed.resetTestingModule();
      setupAt();
      waitForHint();
      expect(hint()).not.toBeNull();
      fixture.destroy();
    }));

    it('garbage in storage is no snooze', fakeAsync(() => {
      localStorage.setItem(CHAT_HINT_STORAGE, 'abc');
      setupAt();
      waitForHint();
      expect(hint()).not.toBeNull();
      fixture.destroy();
    }));

    it('blocked storage: the hint shows and the cross still works', fakeAsync(() => {
      spyOn(Storage.prototype, 'getItem').and.throwError('blocked');
      spyOn(Storage.prototype, 'setItem').and.throwError('blocked');
      setupAt();
      waitForHint();
      expect(hint()).not.toBeNull();
      hintClose()!.click();
      fixture.detectChanges();
      expect(hint()).toBeNull();
      fixture.destroy();
    }));

    it('no hint on the checkout page (query and fragment ignored), it comes back on another page', fakeAsync(() => {
      setupAt('/ru/checkout?utm=1#pay');
      waitForHint();
      expect(hint()).toBeNull();
      TestBed.inject(Router).navigateByUrl('/ro/checkout');
      tick();
      fixture.detectChanges();
      expect(hint()).toBeNull();
      TestBed.inject(Router).navigateByUrl('/ru');
      tick();
      fixture.detectChanges();
      expect(hint()).not.toBeNull();
      TestBed.inject(Router).navigateByUrl('/ru/checkout');
      tick();
      fixture.detectChanges();
      expect(hint()).toBeNull();
      fixture.destroy();
    }));

    it('no hint when the widget is not visible: bot, chat switched off, server', fakeAsync(() => {
      setup({ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)'});
      waitForHint();
      expect(hint()).toBeNull();
      fixture.destroy();

      TestBed.resetTestingModule();
      setupAt();
      waitForHint();
      expect(hint()).not.toBeNull();
      chat.enabled.set(false);
      fixture.detectChanges();
      expect(hint()).toBeNull();
      expect(launcher()).toBeNull();
      fixture.destroy();

      TestBed.resetTestingModule();
      const setItem = spyOn(Storage.prototype, 'setItem').and.callThrough();
      setup({platform: 'server'});
      tick(CHAT_HINT_DELAY_MS * 2);
      fixture.detectChanges();
      expect(hint()).toBeNull();
      expect(setItem).not.toHaveBeenCalled();
    }));
  });

  it('platform server: renders nothing and never touches localStorage or the network', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    const getItem = spyOn(Storage.prototype, 'getItem').and.callThrough();
    const setItem = spyOn(Storage.prototype, 'setItem').and.callThrough();
    setup({platform: 'server'});
    expect(el().children.length).toBe(0);
    expect(el().textContent!.trim()).toBe('');
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    http.expectNone(() => true);
  });

  it('bots get no button and no requests', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup({ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)'});
    expect(launcher()).toBeNull();
    http.expectNone(() => true);
  });

  it('without a conversation: button shown, no polling, no key until the first message', () => {
    setup();
    expect(launcher()).not.toBeNull();
    http.expectNone(() => true);
    expect(chat.nextPollDelay()).toBeNull();
    openWindow();
    expect(localStorage.getItem(CHAT_KEY_STORAGE)).toBeNull();
  });

  it('sending adds the message, creates sr_chat_id and sends language, pageUrl without query, no visitorId without consent', () => {
    localStorage.setItem(VISITOR_ID_KEY, VISITOR); // no cookie_consent → must not be sent
    setup();
    openWindow();
    type('  Есть размер S?  ');
    sendClick();

    const key = localStorage.getItem(CHAT_KEY_STORAGE);
    expect(key).toMatch(UUID_RE);
    const req = expectSend();
    expect(req.request.headers.get('X-Chat-Key')).toBe(key);
    const body = req.request.body as ChatSendBody;
    expect(body.text).toBe('Есть размер S?');
    expect(body.clientMessageId).toMatch(UUID_RE);
    expect(body.language).toBe('ru');
    expect(body.visitorId).toBeNull();
    expect(body.website).toBe('');
    expect(body.pageUrl).toBe(location.origin + location.pathname);
    expect(body.pageUrl).not.toContain('?');

    req.flush({conversationId: 'conv-1', message: msg(1, 'CUSTOMER', 'Есть размер S?'), autoReply: null} as ChatSendResponse,
      {status: 201, statusText: 'Created'});
    fixture.detectChanges();
    const mine = el().querySelectorAll('.chat-msg--mine');
    expect(mine.length).toBe(1);
    expect(mine[0].textContent).toContain('Есть размер S?');
    expect(textarea().value).toBe('');
    expect(chat.nextPollDelay()).toBe(CHAT_POLL_OPEN_MS);
  });

  it('with cookie_consent=accepted the visitorId goes with the message', () => {
    localStorage.setItem('cookie_consent', 'accepted');
    localStorage.setItem(VISITOR_ID_KEY, VISITOR);
    setup();
    openWindow();
    type('Привет');
    sendClick();
    const req = expectSend();
    expect((req.request.body as ChatSendBody).visitorId).toBe(VISITOR);
    req.flush({conversationId: 'c', message: msg(1, 'CUSTOMER'), autoReply: null});
  });

  it('cookie_consent=declined: no visitorId', () => {
    localStorage.setItem('cookie_consent', 'declined');
    localStorage.setItem(VISITOR_ID_KEY, VISITOR);
    setup();
    openWindow();
    type('Привет');
    sendClick();
    const req = expectSend();
    expect((req.request.body as ChatSendBody).visitorId).toBeNull();
    req.flush({conversationId: 'c', message: msg(1, 'CUSTOMER'), autoReply: null});
  });

  it('with sr_chat_id the history loads on start (after=0), staff signed "Secret Room", cursor = max seq', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    const req = expectPoll(0);
    expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
    req.flush(pollResponse([msg(1, 'CUSTOMER', 'вопрос'), msg(2, 'STAFF', 'ответ')]));
    fixture.detectChanges();
    expect(chat.nextPollDelay()).toBe(CHAT_POLL_CLOSED_MS);

    openWindow();
    expect(el().querySelectorAll('.chat-msg').length).toBe(2);
    const shop = el().querySelector('.chat-msg--shop')!;
    expect(shop.querySelector('.chat-msg__author')!.textContent).toContain('chat.shopName');
    expect(shop.textContent).toContain('ответ');

    chat.poll();
    expectPoll(2).flush(pollResponse([]));
  });

  it('unread badge is shown and goes dark after opening (POST read with the max seq)', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER'), msg(2, 'STAFF'), msg(3, 'STAFF')], 2));
    fixture.detectChanges();
    expect(el().querySelector('.chat-badge')!.textContent).toContain('2');

    openWindow();
    const read = http.expectOne(`${BASE}/read`);
    expect(read.request.body).toEqual({seq: 3});
    expect(read.request.headers.get('X-Chat-Key')).toBe(KEY);
    read.flush(null, {status: 204, statusText: 'No Content'});
    expect(chat.unread()).toBe(0);

    chat.close();
    fixture.detectChanges();
    expect(el().querySelector('.chat-badge')).toBeNull();
  });

  it('a reply arriving while the window is open is marked read right away', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER')]));
    openWindow();
    chat.poll();
    expectPoll(1).flush(pollResponse([msg(2, 'STAFF')], 1));
    const read = http.expectOne(`${BASE}/read`);
    expect(read.request.body).toEqual({seq: 2});
    read.flush(null, {status: 204, statusText: 'No Content'});
    expect(chat.unread()).toBe(0);
  });

  it('dedups by messageId: POST answer and poll returning the same message show it once', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    expectPoll(0).flush(pollResponse([]));
    openWindow();
    type('один');
    sendClick();
    expectSend().flush({conversationId: 'c', message: msg(5, 'CUSTOMER', 'один'), autoReply: null});
    chat.poll();
    expectPoll(5).flush(pollResponse([msg(5, 'CUSTOMER', 'один')]));
    fixture.detectChanges();
    expect(el().querySelectorAll('.chat-msg').length).toBe(1);
  });

  it('429: shows "too often", keeps the text', () => {
    setup();
    openWindow();
    type('Срочно!');
    sendClick();
    expectSend().flush({error: 'RATE_LIMIT', retryAfterSeconds: 60}, {status: 429, statusText: 'Too Many Requests'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.rateLimit');
    expect(textarea().value).toBe('Срочно!');
    expect(chat.draft()).toBe('Срочно!');
  });

  it('400 TOO_LONG and BAD_PHONE show their messages', () => {
    setup();
    openWindow();
    type('текст');
    sendClick();
    expectSend().flush({error: 'TOO_LONG', max: 1000}, {status: 400, statusText: 'Bad Request'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.tooLong');

    sendClick();
    expectSend().flush({error: 'BAD_PHONE'}, {status: 400, statusText: 'Bad Request'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.badPhone');
  });

  it('network error: "not sent" + "retry" with the same clientMessageId, text stays', () => {
    setup();
    openWindow();
    type('Привет');
    sendClick();
    const first = expectSend();
    const id = (first.request.body as ChatSendBody).clientMessageId;
    first.error(new ProgressEvent('error'), {status: 0, statusText: 'Unknown Error'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.notSent');
    expect(textarea().value).toBe('Привет');

    el().querySelector<HTMLButtonElement>('.chat-error__retry')!.click();
    fixture.detectChanges();
    const second = expectSend();
    expect((second.request.body as ChatSendBody).clientMessageId).toBe(id);
    second.flush({conversationId: 'c', message: msg(1, 'CUSTOMER', 'Привет'), autoReply: null});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error')).toBeNull();
  });

  it('5xx counts as "not sent" too', () => {
    setup();
    openWindow();
    type('Привет');
    sendClick();
    expectSend().flush('oops', {status: 503, statusText: 'Service Unavailable'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-error__retry')).not.toBeNull();
  });

  it('Enter sends, Shift+Enter does not', () => {
    setup();
    openWindow();
    type('строка');
    textarea().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', shiftKey: true}));
    http.expectNone(`${BASE}/messages`);
    textarea().dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter'}));
    expectSend().flush({conversationId: 'c', message: msg(1, 'CUSTOMER'), autoReply: null});
  });

  it('textarea is limited to 1000 chars with a counter', () => {
    setup();
    openWindow();
    expect(textarea().maxLength).toBe(1000);
    type('abc');
    expect(el().querySelector('.chat-counter')!.textContent).toContain('3/1000');
  });

  it('name and phone from "introduce" go with the message', () => {
    setup();
    openWindow();
    el().querySelector<HTMLButtonElement>('.chat-intro__toggle')!.click();
    fixture.detectChanges();
    const [name, phone] = Array.from(el().querySelectorAll<HTMLInputElement>('.chat-intro__fields input'));
    name.value = 'Ана';
    name.dispatchEvent(new Event('input'));
    phone.value = '069123456';
    phone.dispatchEvent(new Event('input'));
    type('Перезвоните');
    sendClick();
    const body = expectSend().request.body as ChatSendBody;
    expect(body.name).toBe('Ана');
    expect(body.phone).toBe('069123456');
  });

  it('auto-reply without a phone shows the phone form → POST contact', () => {
    setup();
    openWindow();
    type('Ночью');
    sendClick();
    expectSend().flush({
      conversationId: 'c', message: msg(1, 'CUSTOMER', 'Ночью'), autoReply: msg(2, 'SYSTEM', 'Сейчас нерабочее время'),
    });
    fixture.detectChanges();
    http.expectOne(`${BASE}/read`).flush(null, {status: 204, statusText: 'No Content'});
    expect(el().querySelector('.chat-msg--shop')!.textContent).toContain('chat.shopName');

    const phoneInput = el().querySelector<HTMLInputElement>('.chat-phone input')!;
    phoneInput.value = 'abc';
    phoneInput.dispatchEvent(new Event('input'));
    el().querySelector<HTMLButtonElement>('.chat-phone .chat-btn')!.click();
    fixture.detectChanges();
    http.expectNone(`${BASE}/contact`);
    expect(el().querySelector('.chat-phone .chat-error')!.textContent).toContain('chat.errors.badPhone');

    phoneInput.value = '+373 69 123 456';
    phoneInput.dispatchEvent(new Event('input'));
    el().querySelector<HTMLButtonElement>('.chat-phone .chat-btn')!.click();
    const contact = http.expectOne(`${BASE}/contact`);
    expect(contact.request.body).toEqual({name: null, phone: '+373 69 123 456'});
    contact.flush(null, {status: 204, statusText: 'No Content'});
    fixture.detectChanges();
    expect(el().querySelector('.chat-phone')).toBeNull();
    expect(el().querySelector('.chat-phone__done')).not.toBeNull();
  });

  it('no phone form when the phone is already known', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER'), msg(2, 'SYSTEM')], 0, true));
    openWindow();
    expect(el().querySelector('.chat-phone')).toBeNull();
  });

  it('HTML in messages is shown as text (no img/script in the DOM)', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    const img = '<img src=x onerror=alert(1)>';
    const script = '<script>alert(1)</script>';
    expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER', img), msg(2, 'STAFF', script)]));
    openWindow();
    http.match(`${BASE}/read`).forEach(r => r.flush(null, {status: 204, statusText: 'No Content'}));
    const list = el().querySelector('.chat-list')!;
    expect(list.querySelector('img')).toBeNull();
    expect(list.querySelector('script')).toBeNull();
    expect(list.textContent).toContain(img);
    expect(list.textContent).toContain(script);
  });

  it('404 from the chat API (chat off) hides the button', () => {
    localStorage.setItem(CHAT_KEY_STORAGE, KEY);
    setup();
    expect(launcher()).not.toBeNull();
    expectPoll(0).flush({error: 'NOT_FOUND'}, {status: 404, statusText: 'Not Found'});
    fixture.detectChanges();
    expect(launcher()).toBeNull();
    expect(chat.nextPollDelay()).toBeNull();
  });

  it('localStorage failing: the chat still works in memory', () => {
    spyOn(Storage.prototype, 'getItem').and.throwError('SecurityError');
    spyOn(Storage.prototype, 'setItem').and.throwError('QuotaExceededError');
    setup();
    openWindow();
    type('Привет');
    sendClick();
    const req = expectSend();
    expect(req.request.headers.get('X-Chat-Key')).toMatch(UUID_RE);
    req.flush({conversationId: 'c', message: msg(1, 'CUSTOMER', 'Привет'), autoReply: null});
    fixture.detectChanges();
    expect(el().querySelectorAll('.chat-msg').length).toBe(1);
  });

  describe('SR-220: types, pictures, product cards, links', () => {
    const PRODUCT: ChatProduct = {
      productId: 12, name: 'Бюстгальтер', price: 900, oldPrice: 1200,
      imageUrl: 'https://api.secretroom.md/img/1.jpg', siteUrl: 'https://secretroom.md/ru/product/12/biust',
    };
    const DRAFT: ChatProductDraft = {productId: 12, name: 'Бюстгальтер', price: 900, oldPrice: 1200, imageUrl: null};

    function imageMsg(seq: number, attachmentId = 'att-1', text = ''): ChatMessage {
      return {...msg(seq, 'STAFF', text), type: 'IMAGE', image: {attachmentId, width: 1600, height: 1200}};
    }

    function productMsg(seq: number, text = '', author: ChatMessage['author'] = 'CUSTOMER'): ChatMessage {
      return {...msg(seq, author, text), type: 'PRODUCT', product: PRODUCT};
    }

    function flushReads() {
      http.match(`${BASE}/read`).forEach(r => r.flush(null, {status: 204, statusText: 'No Content'}));
    }

    function withHistory(messages: ChatMessage[]) {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      expectPoll(0).flush(pollResponse(messages));
      openWindow();
      flushReads();
    }

    it('old messages without type (and null / unknown type) are shown as text', () => {
      withHistory([
        msg(1, 'STAFF', 'старое'),
        {...msg(2, 'STAFF', 'null-тип'), type: null},
        {...msg(3, 'STAFF', 'видео'), type: 'VIDEO' as never},
        {...msg(4, 'STAFF', 'без вложения'), type: 'IMAGE'},
      ]);
      const texts = Array.from(el().querySelectorAll('.chat-msg__text')).map(p => p.textContent);
      expect(texts).toEqual(['старое', 'null-тип', 'видео', 'без вложения']);
      expect(el().querySelector('.chat-img')).toBeNull();
      http.expectNone(r => r.url.includes('/attachments/'));
    });

    it('links: http(s) clickable with target/rel; javascript:, data: and HTML stay text', () => {
      withHistory([
        msg(1, 'STAFF', 'Смотрите https://secretroom.md/ru/sale.'),
        msg(2, 'CUSTOMER', 'javascript:alert(1) data:text/html,<b>x</b> <a href=javascript:alert(1)>x</a> "><img src=x onerror=alert(1)>'),
      ]);
      const links = Array.from(el().querySelectorAll<HTMLAnchorElement>('.chat-list a.chat-msg__link'));
      expect(links.length).toBe(1);
      expect(links[0].getAttribute('href')).toBe('https://secretroom.md/ru/sale');
      expect(links[0].textContent).toBe('https://secretroom.md/ru/sale');
      expect(links[0].target).toBe('_blank');
      expect(links[0].rel).toBe('noopener noreferrer nofollow');
      expect(el().querySelectorAll('.chat-msg__text')[0].textContent).toBe('Смотрите https://secretroom.md/ru/sale.');
      const mine = el().querySelector('.chat-msg--mine')!;
      expect(mine.querySelector('a, img, b')).toBeNull();
      expect(mine.textContent).toContain('"><img src=x onerror=alert(1)>');
    });

    it('staff picture: loaded as a blob with X-Chat-Key, shown via blob URL, zoomed, Esc closes; URL revoked on destroy', () => {
      const revoke = spyOn(URL, 'revokeObjectURL').and.callThrough();
      withHistory([imageMsg(1, 'att-1', 'Вот так')]);
      const box = el().querySelector<HTMLElement>('.chat-img')!;
      expect(box.style.aspectRatio).toContain('1600');
      expect(box.querySelector('.chat-img__loading')).not.toBeNull();

      const req = http.expectOne(`${BASE}/attachments/att-1`);
      expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
      expect(req.request.responseType).toBe('blob');
      req.flush(new Blob(['jpeg'], {type: 'image/jpeg'}));
      fixture.detectChanges();

      const pic = el().querySelector<HTMLImageElement>('.chat-img__pic')!;
      expect(pic.src).toMatch(/^blob:/);
      expect(pic.alt).toBe('chat.image.alt');
      expect(el().querySelector('.chat-msg--shop .chat-msg__text')!.textContent).toBe('Вот так');

      el().querySelector<HTMLButtonElement>('.chat-img__open')!.click();
      fixture.detectChanges();
      const zoom = el().querySelector<HTMLElement>('.chat-zoom')!;
      expect(zoom.querySelector<HTMLImageElement>('.chat-zoom__pic')!.src).toBe(pic.src);
      zoom.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
      fixture.detectChanges();
      expect(el().querySelector('.chat-zoom')).toBeNull();
      expect(el().querySelector('.chat-window')).not.toBeNull(); // Esc closed the picture, not the window

      // closed and reopened: the cached picture, no second request
      chat.close();
      fixture.detectChanges();
      openWindow();
      http.expectNone(`${BASE}/attachments/att-1`);
      expect(el().querySelector<HTMLImageElement>('.chat-img__pic')!.src).toBe(pic.src);

      const url = pic.src;
      fixture.destroy();
      expect(revoke).toHaveBeenCalledWith(url);
    });

    it('zoom: the cross and a click on the backdrop close it, a click on the picture does not', () => {
      withHistory([imageMsg(1)]);
      http.expectOne(`${BASE}/attachments/att-1`).flush(new Blob(['png'], {type: 'image/png'}));
      fixture.detectChanges();
      const open = () => {
        el().querySelector<HTMLButtonElement>('.chat-img__open')!.click();
        fixture.detectChanges();
      };
      open();
      el().querySelector<HTMLImageElement>('.chat-zoom__pic')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.chat-zoom')).not.toBeNull();
      el().querySelector<HTMLElement>('.chat-zoom')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.chat-zoom')).toBeNull();
      open();
      el().querySelector<HTMLButtonElement>('.chat-zoom__close')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.chat-zoom')).toBeNull();
    });

    it('zoom: Esc closes it even after a click on the picture moved the focus to body; focus back on the preview', () => {
      withHistory([imageMsg(1)]);
      http.expectOne(`${BASE}/attachments/att-1`).flush(new Blob(['png'], {type: 'image/png'}));
      fixture.detectChanges();
      const preview = el().querySelector<HTMLButtonElement>('.chat-img__open')!;
      preview.focus();
      preview.click();
      fixture.detectChanges();
      expect(document.activeElement).toBe(el().querySelector('.chat-zoom__close')); // focus on the cross when opened

      el().querySelector<HTMLImageElement>('.chat-zoom__pic')!.click();
      (document.activeElement as HTMLElement).blur();
      fixture.detectChanges();
      expect(document.activeElement).toBe(document.body);
      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      fixture.detectChanges();
      expect(el().querySelector('.chat-zoom')).toBeNull();
      expect(el().querySelector('.chat-window')).not.toBeNull(); // only the picture, the window stays
      expect(document.activeElement).toBe(el().querySelector('.chat-img__open'));

      document.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      fixture.detectChanges();
      expect(el().querySelector('.chat-window')).not.toBeNull(); // no picture: Esc on body does not close the window
    });

    it('picture failed (404 / not an image): a neat placeholder, the chat stays on', () => {
      withHistory([imageMsg(1, 'att-1'), imageMsg(2, 'att-2')]);
      // responseType blob: the error body is a Blob too
      http.expectOne(`${BASE}/attachments/att-1`).flush(new Blob(['{"error":"NOT_FOUND"}'], {type: 'application/json'}),
        {status: 404, statusText: 'Not Found'});
      http.expectOne(`${BASE}/attachments/att-2`).flush(new Blob(['<html>'], {type: 'text/html'}));
      fixture.detectChanges();
      const failed = el().querySelectorAll('.chat-img__failed');
      expect(failed.length).toBe(2);
      expect(failed[0].textContent).toContain('chat.image.failed');
      expect(el().querySelector('.chat-img img')).toBeNull();
      expect(chat.enabled()).toBeTrue();
    });

    it('pictures are not loaded while the window is closed', () => {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      expectPoll(0).flush(pollResponse([imageMsg(1)], 1));
      http.expectNone(r => r.url.includes('/attachments/'));
      openWindow();
      flushReads();
      http.expectOne(`${BASE}/attachments/att-1`).flush(new Blob(['x'], {type: 'image/jpeg'}));
    });

    it('product card in a message: photo (lazy), name, price with the old one struck through, internal link', () => {
      withHistory([productMsg(1, 'Есть 75B?'), productMsg(2, '', 'STAFF')]);
      const cards = el().querySelectorAll<HTMLElement>('app-chat-product-card');
      expect(cards.length).toBe(2);
      const card = cards[0];
      const link = card.querySelector<HTMLAnchorElement>('a.chat-pc')!;
      expect(link.getAttribute('href')).toBe('/ru/product/12/byustgalter');
      expect(link.target).toBe('');
      const img = card.querySelector<HTMLImageElement>('img')!;
      expect(img.getAttribute('loading')).toBe('lazy');
      expect(img.getAttribute('src')).toBe(PRODUCT.imageUrl);
      expect(card.querySelector('.chat-pc__name')!.textContent).toContain('Бюстгальтер');
      expect(card.querySelector('.old-price')!.textContent).toContain('1200 MDL');
      expect(card.querySelector('.price')!.textContent).toContain('900 MDL');
      expect(el().querySelector('.chat-msg--mine .chat-msg__text')!.textContent).toBe('Есть 75B?');
      // empty question: no empty text line
      expect(el().querySelector('.chat-msg--shop .chat-msg__text')).toBeNull();
    });

    it('product card: a non-http photo is replaced by the placeholder; a broken photo too', () => {
      withHistory([{...productMsg(1), product: {...PRODUCT, imageUrl: 'javascript:alert(1)'}}, productMsg(2)]);
      const imgs = el().querySelectorAll<HTMLImageElement>('app-chat-product-card img');
      expect(imgs[0].getAttribute('src')).toBe('assets/images/no-image.png');
      imgs[1].dispatchEvent(new Event('error'));
      fixture.detectChanges();
      expect(imgs[1].getAttribute('src')).toBe('assets/images/no-image.png');
    });

    it('"Ask in chat" before the widget appeared: opens the window with the draft card; empty text is allowed', () => {
      setup({beforeCreate: () => TestBed.inject(ChatAsk).ask(DRAFT)});
      fixture.detectChanges();
      expect(chat.open()).toBeTrue();
      expect(TestBed.inject(ChatAsk).request()).toBeNull();
      const draft = el().querySelector('.chat-draft')!;
      expect(draft.textContent).toContain('chat.product.askingAbout');
      expect(draft.querySelector('.chat-pc__name')!.textContent).toContain('Бюстгальтер');
      const sendBtn = el().querySelector<HTMLButtonElement>('.chat-input__send')!;
      expect(sendBtn.disabled).toBeFalse();

      sendClick();
      const key = localStorage.getItem(CHAT_KEY_STORAGE);
      expect(key).toMatch(UUID_RE); // the first card creates the conversation, like the first text
      const req = expectSend();
      expect(req.request.headers.get('X-Chat-Key')).toBe(key);
      const body = req.request.body as ChatSendBody;
      expect(body.type).toBe('PRODUCT');
      expect(body.productId).toBe(12);
      expect(body.text).toBe('');
      expect(body.clientMessageId).toMatch(UUID_RE);
      req.flush({conversationId: 'c', message: productMsg(1), autoReply: null}, {status: 201, statusText: 'Created'});
      fixture.detectChanges();
      expect(el().querySelector('.chat-draft')).toBeNull();
      expect(el().querySelector('.chat-msg--mine app-chat-product-card')).not.toBeNull();
    });

    it('"Ask in chat" while the widget lives: the card with a question; the cross removes the card', () => {
      setup();
      const ask = TestBed.inject(ChatAsk);
      ask.ask(DRAFT);
      fixture.detectChanges();
      expect(chat.open()).toBeTrue();
      type('Есть 75B?');
      sendClick();
      const body = expectSend().request.body as ChatSendBody;
      expect(body).toEqual(jasmine.objectContaining({type: 'PRODUCT', productId: 12, text: 'Есть 75B?'}));
    });

    it('cross on the draft: a plain TEXT message goes without type/productId (as before SR-220)', () => {
      setup();
      TestBed.inject(ChatAsk).ask(DRAFT);
      fixture.detectChanges();
      el().querySelector<HTMLButtonElement>('.chat-draft__remove')!.click();
      fixture.detectChanges();
      expect(el().querySelector('.chat-draft')).toBeNull();
      expect(el().querySelector<HTMLButtonElement>('.chat-input__send')!.disabled).toBeTrue();
      type('Просто вопрос');
      sendClick();
      const body = expectSend().request.body as ChatSendBody;
      expect('type' in body).toBeFalse();
      expect('productId' in body).toBeFalse();
    });

    it('PRODUCT_NOT_FOUND: translated error, card dropped, text kept, chat stays on', () => {
      setup();
      TestBed.inject(ChatAsk).ask(DRAFT);
      fixture.detectChanges();
      type('Есть 75B?');
      sendClick();
      expectSend().flush({error: 'PRODUCT_NOT_FOUND'}, {status: 404, statusText: 'Not Found'});
      fixture.detectChanges();
      expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.productNotFound');
      expect(el().querySelector('.chat-draft')).toBeNull();
      expect(textarea().value).toBe('Есть 75B?');
      expect(chat.enabled()).toBeTrue();
      expect(TestBed.inject(ChatAsk).available()).toBeTrue();
    });

    it('BAD_TYPE: translated error, the card stays', () => {
      setup();
      TestBed.inject(ChatAsk).ask(DRAFT);
      fixture.detectChanges();
      sendClick();
      expectSend().flush({error: 'BAD_TYPE'}, {status: 400, statusText: 'Bad Request'});
      fixture.detectChanges();
      expect(el().querySelector('.chat-error')!.textContent).toContain('chat.errors.badType');
      expect(el().querySelector('.chat-draft')).not.toBeNull();
    });

    it('chat switched off (404): "Ask in chat" is no longer available', () => {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      expectPoll(0).flush({error: 'CHAT_DISABLED'}, {status: 404, statusText: 'Not Found'});
      const ask = TestBed.inject(ChatAsk);
      expect(ask.available()).toBeFalse();
      ask.ask(DRAFT);
      fixture.detectChanges();
      expect(chat.open()).toBeFalse();
    });

    describe('SR-238: «Написать в чат» from Contacts', () => {
      it('request made before the widget exists: the window opens when it appears, the hint is snoozed', () => {
        setup({beforeCreate: () => TestBed.inject(ChatAsk).open()});
        expect(chat.open()).toBeTrue();
        expect(TestBed.inject(ChatAsk).openRequested()).toBeFalse();
        expect(localStorage.getItem(CHAT_HINT_STORAGE)).not.toBeNull();
      });

      it('request while the widget lives: opens the window (through toggle) and snoozes the hint for 24 h', () => {
        setup();
        expect(chat.open()).toBeFalse();
        expect(localStorage.getItem(CHAT_HINT_STORAGE)).toBeNull();
        const before = Date.now();
        TestBed.inject(ChatAsk).open();
        fixture.detectChanges();
        expect(chat.open()).toBeTrue();
        expect(el().querySelector('.chat-window')).not.toBeNull();
        expect(Number(localStorage.getItem(CHAT_HINT_STORAGE))).toBeGreaterThanOrEqual(before + CHAT_HINT_SNOOZE_MS);
      });

      it('window already open: stays open, the input gets focus', async () => {
        setup();
        openWindow();
        expect(chat.open()).toBeTrue();
        (document.activeElement as HTMLElement | null)?.blur();
        TestBed.inject(ChatAsk).open();
        fixture.detectChanges();
        await fixture.whenStable();
        expect(chat.open()).toBeTrue();
        expect(TestBed.inject(ChatAsk).openRequested()).toBeFalse();
        expect(document.activeElement).toBe(textarea());
      });

      it('chat switched off: the request does nothing', () => {
        localStorage.setItem(CHAT_KEY_STORAGE, KEY);
        setup();
        expectPoll(0).flush({error: 'CHAT_DISABLED'}, {status: 404, statusText: 'Not Found'});
        const ask = TestBed.inject(ChatAsk);
        ask.open();
        fixture.detectChanges();
        expect(ask.openRequested()).toBeFalse();
        expect(chat.open()).toBeFalse();
      });
    });

    it('bots: "Ask in chat" is not available', () => {
      setup({ua: 'Mozilla/5.0 (compatible; Googlebot/2.1)'});
      expect(TestBed.inject(ChatAsk).available()).toBeFalse();
    });
  });

  describe('window below the site header', () => {
    let header: HTMLElement | null = null;

    function addHeader(height: number) {
      header = document.createElement('app-header');
      header.innerHTML = `<div class="header" style="position:fixed;top:0;left:0;width:100%;height:${height}px"></div>`;
      document.body.appendChild(header);
    }

    afterEach(() => header?.remove());

    it('open window keeps below the fixed header and follows its height; closed — not measured', async () => {
      addHeader(282);
      setup();
      expect(chat.topReserve()).toBeNull();

      openWindow();
      const win = el().querySelector<HTMLElement>('.chat-window')!;
      expect(chat.topReserve()).toBe(282 + CHAT_TOP_GAP);
      expect(win.style.getPropertyValue('--chat-top')).toBe(`${282 + CHAT_TOP_GAP}px`);

      // page scrolled: the header shrinks, the window gets the room back
      header!.querySelector<HTMLElement>('.header')!.style.height = '122px';
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve)));
      expect(chat.topReserve()).toBe(122 + CHAT_TOP_GAP);
      fixture.detectChanges();
      expect(win.style.getPropertyValue('--chat-top')).toBe(`${122 + CHAT_TOP_GAP}px`);
    });

    it('no desktop header (mobile layout / hidden header): CSS default, no --chat-top', () => {
      addHeader(0);
      setup();
      openWindow();
      expect(chat.topReserve()).toBeNull();
      expect(el().querySelector<HTMLElement>('.chat-window')!.style.getPropertyValue('--chat-top')).toBe('');
    });
  });

  describe('poll timing', () => {
    beforeEach(() => jasmine.clock().install());
    afterEach(() => jasmine.clock().uninstall());

    it('with sr_chat_id: one request right at start, badge shown at once, no second request before 30 s', () => {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      const reqs = http.match(r => r.method === 'GET' && r.url === `${BASE}/messages`);
      expect(reqs.length).toBe(1);
      expect(reqs[0].request.params.get('after')).toBe('0');
      reqs[0].flush(pollResponse([msg(1, 'CUSTOMER'), msg(2, 'STAFF')], 1));
      fixture.detectChanges();
      expect(el().querySelector('.chat-badge')!.textContent).toContain('1');

      jasmine.clock().tick(CHAT_POLL_CLOSED_MS - 1);
      http.expectNone(() => true);
      jasmine.clock().tick(1);
      expectPoll(2).flush(pollResponse([], 1));
    });

    it('closed window: next poll after 30 s; open: after 4 s; stops on destroy', () => {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER')]));

      jasmine.clock().tick(CHAT_POLL_CLOSED_MS - 1);
      http.expectNone(`${BASE}/messages?after=1`);
      jasmine.clock().tick(1);
      expectPoll(1).flush(pollResponse([]));

      openWindow();
      jasmine.clock().tick(CHAT_POLL_OPEN_MS);
      expectPoll(1).flush(pollResponse([]));

      fixture.destroy();
      jasmine.clock().tick(CHAT_POLL_CLOSED_MS * 2);
      http.expectNone(() => true);
    });

    it('hidden tab: polling stops; back to the tab: one request right away', () => {
      localStorage.setItem(CHAT_KEY_STORAGE, KEY);
      setup();
      expectPoll(0).flush(pollResponse([msg(1, 'CUSTOMER')]));

      visibility = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      expect(chat.nextPollDelay()).toBeNull();
      jasmine.clock().tick(CHAT_POLL_CLOSED_MS * 3);
      http.expectNone(() => true);

      visibility = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
      expectPoll(1).flush(pollResponse([]));
      expect(chat.nextPollDelay()).toBe(CHAT_POLL_CLOSED_MS);
    });
  });
});
