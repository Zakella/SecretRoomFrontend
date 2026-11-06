import {TestBed} from '@angular/core/testing';
import {HttpErrorResponse, provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ChatApi, chatErrorKind, ChatSendBody, isChatDisabled} from './chat-api';
import {SKIP_LOADER} from '../../@core/interceptors/loader-interceptor';
import {environment} from '../../../environments/environment';

const KEY = '0f8fad5b-d9cb-469f-a165-70867728950e';
const BASE = environment.apiUrl + 'v1/chat';

function httpError(status: number, error: unknown = null): HttpErrorResponse {
  return new HttpErrorResponse({status, error});
}

describe('ChatApi (SR-218)', () => {
  let api: ChatApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    api = TestBed.inject(ChatApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('send: POST messages with the key in X-Chat-Key, body as is, without the global loader', () => {
    const body: ChatSendBody = {
      clientMessageId: 'c1', text: 'Привет', name: null, phone: null, language: 'ru',
      visitorId: null, pageUrl: 'https://secretroom.md/ru', website: '',
    };
    api.send(KEY, body).subscribe();
    const req = http.expectOne(`${BASE}/messages`);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
    expect(req.request.body).toEqual(body);
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    req.flush({});
  });

  it('poll: GET messages?after=<seq>; the key never goes into the URL', () => {
    api.poll(KEY, 7).subscribe();
    const req = http.expectOne(r => r.url === `${BASE}/messages`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('after')).toBe('7');
    expect(req.request.urlWithParams).not.toContain(KEY);
    expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    req.flush({conversationId: null, messages: [], unread: 0, hasPhone: false});
  });

  it('read: POST read {seq}', () => {
    api.read(KEY, 12).subscribe();
    const req = http.expectOne(`${BASE}/read`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({seq: 12});
    expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    req.flush(null, {status: 204, statusText: 'No Content'});
  });

  it('contact: POST contact {name, phone}', () => {
    api.contact(KEY, {name: 'Ana', phone: '+373 69 123 456'}).subscribe();
    const req = http.expectOne(`${BASE}/contact`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({name: 'Ana', phone: '+373 69 123 456'});
    expect(req.request.headers.get('X-Chat-Key')).toBe(KEY);
    req.flush(null, {status: 204, statusText: 'No Content'});
  });

  it('maps errors to what the widget shows', () => {
    expect(chatErrorKind(httpError(429, {error: 'RATE_LIMIT', retryAfterSeconds: 60}))).toBe('rateLimit');
    expect(chatErrorKind(httpError(400, {error: 'TOO_LONG', max: 1000}))).toBe('tooLong');
    expect(chatErrorKind(httpError(413))).toBe('tooLong');
    expect(chatErrorKind(httpError(400, {error: 'BAD_PHONE'}))).toBe('badPhone');
    expect(chatErrorKind(httpError(400, {error: 'SPAM'}))).toBe('spam');
    expect(chatErrorKind(httpError(0))).toBe('notSent');
    expect(chatErrorKind(httpError(502, '<html>bad gateway</html>'))).toBe('notSent');
  });

  it('404 means "chat off", except NO_CONVERSATION of contact', () => {
    expect(isChatDisabled(httpError(404))).toBeTrue();
    expect(isChatDisabled(httpError(404, {error: 'NOT_FOUND'}))).toBeTrue();
    expect(isChatDisabled(httpError(404, {error: 'NO_CONVERSATION'}))).toBeFalse();
    expect(isChatDisabled(httpError(500))).toBeFalse();
  });
});
