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
/** SR-220. No field or null = TEXT (messages before SR-220). */
export type ChatMessageType = 'TEXT' | 'IMAGE' | 'PRODUCT';

/** Staff picture; the bytes come from GET attachments/{attachmentId}. */
export interface ChatImage {
  attachmentId: string;
  width?: number | null;
  height?: number | null;
}

/** Catalog snapshot made by webstore at the time of the question. */
export interface ChatProduct {
  productId: number;
  name: string;
  price: number | null;
  oldPrice: number | null;
  imageUrl: string | null;
  siteUrl: string | null;
}

export interface ChatMessage {
  messageId: string;
  seq: number;
  author: ChatAuthor;
  type?: ChatMessageType | null;
  text: string;
  createdAt: string;
  image?: ChatImage | null;
  product?: ChatProduct | null;
}

/** What the widget renders: unknown type or a type without its attachment falls back to TEXT. */
export function chatMessageType(m: ChatMessage): ChatMessageType {
  if (m.type === 'IMAGE' && m.image?.attachmentId) return 'IMAGE';
  if (m.type === 'PRODUCT' && m.product) return 'PRODUCT';
  return 'TEXT';
}

export interface ChatSendBody {
  clientMessageId: string;
  /** SR-220: only for PRODUCT; a TEXT message is sent without it, exactly as before. */
  type?: 'PRODUCT';
  productId?: number;
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
export type ChatErrorKind = 'rateLimit' | 'tooLong' | 'badPhone' | 'spam' | 'productNotFound' | 'badType' | 'notSent';

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
  if (code === 'PRODUCT_NOT_FOUND') return 'productNotFound';
  if (code === 'BAD_TYPE') return 'badType';
  return 'notSent';
}

/** 404 answers that are not "chat switched off". */
const NOT_DISABLED_404 = new Set(['NO_CONVERSATION', 'PRODUCT_NOT_FOUND']);

/**
 * 404 from /v1/chat/** means the chat is switched off (chat.enabled=false); NO_CONVERSATION (contact) and
 * PRODUCT_NOT_FOUND (product card) are normal answers. A failed attachment never switches the chat off (widget).
 */
export function isChatDisabled(error: unknown): boolean {
  return (error as HttpErrorResponse | null)?.status === 404 && !NOT_DISABLED_404.has(chatErrorCode(error));
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

  /** SR-220: staff picture as a blob, with the key in the header (never in an <img src>). */
  attachment(chatKey: string, attachmentId: string): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/attachments/${encodeURIComponent(attachmentId)}`, {
      ...this.options(chatKey),
      responseType: 'blob',
      transferCache: false,
    });
  }

  /** The key goes in a header, never in the URL (nginx/Cloudflare log query strings); no global loader. */
  private options(chatKey: string) {
    return {
      headers: new HttpHeaders({[CHAT_KEY_HEADER]: chatKey}),
      context: new HttpContext().set(SKIP_LOADER, true),
    };
  }
}
