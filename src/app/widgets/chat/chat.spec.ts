import {ComponentFixture, TestBed} from '@angular/core/testing';
import {PLATFORM_ID, signal} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting, TestRequest} from '@angular/common/http/testing';
import {provideRouter} from '@angular/router';
import {provideTransloco} from '@ngneat/transloco';
import {Chat, CHAT_KEY_STORAGE, CHAT_POLL_CLOSED_MS, CHAT_POLL_OPEN_MS, CHAT_TOP_GAP} from './chat';
import {ChatMessage, ChatPollResponse, ChatSendBody, ChatSendResponse} from './chat-api';
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

  function setup(opts: {platform?: 'browser' | 'server'; ua?: string} = {}) {
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
