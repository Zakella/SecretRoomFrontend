import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpContext, HttpErrorResponse, HttpHeaders, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../../environments/environment';
import {SKIP_LOADER} from '../../@core/interceptors/loader-interceptor';

/** SR-218: visitor chat, webstore REST (contract docs/contracts/sr-218-chat.md). */

export const CHAT_KEY_HEADER = 'X-Chat-Key';
export const CHAT_MAX_LENGTH = 1000;
export const CHAT_NAME_MAX = 100;
export const CHAT_PHONE_MAX = 30;
export const CHAT_PAGE_URL_MAX = 500;
/** Same rule as webstore (400 BAD_PHONE). */
export const CHAT_PHONE_RE = /^[0-9+()\- ]{5,30}$/;

export type ChatAuthor = 'CUSTOMER' | 'STAFF' | 'SYSTEM';

export interface ChatMessage {
  messageId: string;
  seq: number;
  author: ChatAuthor;
  text: string;
  createdAt: string;
}

export interface ChatSendBody {
  clientMessageId: string;
  text: string;
  name: string | null;
  phone: string | null;
  language: string;
  visitorId: string | null;
  pageUrl: string | null;
  /** Honeypot: always empty from a human. */
  website: string;
}

export interface ChatSendResponse {
  conversationId: string;
  message: ChatMessage;
  autoReply: ChatMessage | null;
}

export interface ChatPollResponse {
  conversationId: string | null;
  messages: ChatMessage[];
  unread: number;
  hasPhone: boolean;
}

export interface ChatContactBody {
  name: string | null;
  phone: string | null;
}

/** What the widget shows for a failed request. */
export type ChatErrorKind = 'rateLimit' | 'tooLong' | 'badPhone' | 'spam' | 'notSent';

/** Error code of a webstore error body `{ "error": "<CODE>" }`. */
export function chatErrorCode(error: unknown): string {
  const body = (error as HttpErrorResponse | null)?.error as {error?: unknown} | null | undefined;
  return body && typeof body === 'object' && typeof body.error === 'string' ? body.error : '';
}

export function chatErrorKind(error: unknown): ChatErrorKind {
  const status = (error as HttpErrorResponse | null)?.status;
  const code = chatErrorCode(error);
  if (status === 429) return 'rateLimit';
  if (status === 413 || code === 'TOO_LONG') return 'tooLong';
  if (code === 'BAD_PHONE') return 'badPhone';
  if (code === 'SPAM') return 'spam';
  return 'notSent';
}

/** 404 from /v1/chat/** means the chat is switched off (chat.enabled=false); NO_CONVERSATION is a normal answer of contact. */
export function isChatDisabled(error: unknown): boolean {
  return (error as HttpErrorResponse | null)?.status === 404 && chatErrorCode(error) !== 'NO_CONVERSATION';
}

@Injectable({providedIn: 'root'})
export class ChatApi {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl + 'v1/chat';

  send(chatKey: string, body: ChatSendBody): Observable<ChatSendResponse> {
    return this.http.post<ChatSendResponse>(`${this.apiUrl}/messages`, body, this.options(chatKey));
  }

  poll(chatKey: string, after: number): Observable<ChatPollResponse> {
    return this.http.get<ChatPollResponse>(`${this.apiUrl}/messages`, {
      ...this.options(chatKey),
      params: new HttpParams().set('after', String(after)),
      transferCache: false,
    });
  }

  read(chatKey: string, seq: number): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/read`, {seq}, this.options(chatKey));
  }

  contact(chatKey: string, body: ChatContactBody): Observable<void> {
    return this.http.post<void>(`${this.apiUrl}/contact`, body, this.options(chatKey));
  }

  /** The key goes in a header, never in the URL (nginx/Cloudflare log query strings); no global loader. */
  private options(chatKey: string) {
    return {
      headers: new HttpHeaders({[CHAT_KEY_HEADER]: chatKey}),
      context: new HttpContext().set(SKIP_LOADER, true),
    };
  }
}
