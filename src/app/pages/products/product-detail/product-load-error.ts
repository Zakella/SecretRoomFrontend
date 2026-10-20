import {inject, PLATFORM_ID, RESPONSE_INIT} from '@angular/core';
import {isPlatformServer} from '@angular/common';
import {Observable, of} from 'rxjs';

/** Через сколько секунд краулеру стоит повторить запрос карточки после сбоя API. */
export const PRODUCT_RETRY_AFTER_SECONDS = 120;

/** «Товара нет» — только когда API прямо ответил 404. */
export function isProductNotFoundError(error: unknown): boolean {
  return (error as {status?: unknown} | null)?.status === 404;
}

/** 503 + Retry-After + no-store: временный сбой не должен закэшироваться ни у CDN, ни у краулера. */
export function markServiceUnavailable(responseInit: ResponseInit): void {
  const headers = responseInit.headers instanceof Headers ? responseInit.headers : new Headers(responseInit.headers);
  headers.set('Retry-After', String(PRODUCT_RETRY_AFTER_SECONDS));
  headers.set('Cache-Control', 'no-store');
  responseInit.headers = headers;
  responseInit.status = 503;
  responseInit.statusText = 'Service Unavailable';
}

/**
 * Обработчик ошибки загрузки товара для резолвера (catchError).
 *
 * Раньше любая ошибка превращалась в 404: при падении или таймауте бэкенда живые карточки
 * отдавались краулеру как «не найдено» и выпадали из индекса. Теперь:
 * - API ответил 404 → null, страница сама ставит 404 + noindex (как раньше);
 * - любая другая ошибка (5xx, 0/сеть, таймаут) на SSR → 503 с Retry-After, null.
 *
 * Вызывать в контексте внедрения (инициализатор поля): resolve() класса-резолвера
 * Angular вызывает вне injection context.
 */
export function productLoadErrorHandler(): (error: unknown) => Observable<null> {
  const responseInit = isPlatformServer(inject(PLATFORM_ID))
    ? inject(RESPONSE_INIT, {optional: true})
    : null;

  return (error: unknown) => {
    if (responseInit && !isProductNotFoundError(error)) {
      markServiceUnavailable(responseInit);
    }
    return of(null);
  };
}
