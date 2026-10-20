import {Injector, PLATFORM_ID, RESPONSE_INIT, runInInjectionContext} from '@angular/core';
import {HttpErrorResponse} from '@angular/common/http';
import {firstValueFrom} from 'rxjs';
import {
  isProductNotFoundError,
  markServiceUnavailable,
  productLoadErrorHandler,
  PRODUCT_RETRY_AFTER_SECONDS,
} from './product-load-error';

describe('product-load-error', () => {
  const httpError = (status: number) => new HttpErrorResponse({status, url: '/api/products/findProduct/1'});

  function handlerFor(platform: 'server' | 'browser', responseInit: ResponseInit | null) {
    const injector = Injector.create({
      providers: [
        {provide: PLATFORM_ID, useValue: platform},
        ...(responseInit ? [{provide: RESPONSE_INIT, useValue: responseInit}] : []),
      ],
    });
    return runInInjectionContext(injector, () => productLoadErrorHandler());
  }

  describe('isProductNotFoundError', () => {
    it('404 — товара нет', () => {
      expect(isProductNotFoundError(httpError(404))).toBeTrue();
    });

    it('5xx, 0 (сеть/таймаут) и не-HTTP ошибки — не «нет товара»', () => {
      expect(isProductNotFoundError(httpError(500))).toBeFalse();
      expect(isProductNotFoundError(httpError(503))).toBeFalse();
      expect(isProductNotFoundError(httpError(0))).toBeFalse();
      expect(isProductNotFoundError(new Error('timeout'))).toBeFalse();
      expect(isProductNotFoundError(null)).toBeFalse();
    });
  });

  describe('markServiceUnavailable', () => {
    it('ставит 503, Retry-After и Cache-Control: no-store, сохраняя прежние заголовки', () => {
      const init: ResponseInit = {status: 200, headers: new Headers({'Content-Type': 'text/html'})};
      markServiceUnavailable(init);
      const headers = init.headers as Headers;
      expect(init.status).toBe(503);
      expect(init.statusText).toBe('Service Unavailable');
      expect(headers.get('Retry-After')).toBe(String(PRODUCT_RETRY_AFTER_SECONDS));
      expect(headers.get('Cache-Control')).toBe('no-store');
      expect(headers.get('Content-Type')).toBe('text/html');
    });

    it('работает и когда заголовков ещё нет', () => {
      const init: ResponseInit = {};
      markServiceUnavailable(init);
      expect(new Headers(init.headers).get('Retry-After')).toBe(String(PRODUCT_RETRY_AFTER_SECONDS));
    });
  });

  describe('productLoadErrorHandler', () => {
    it('SSR, API ответил 404 — null без 503 (страница сама поставит 404)', async () => {
      const init: ResponseInit = {status: 200, headers: new Headers()};
      const result = await firstValueFrom(handlerFor('server', init)(httpError(404)));
      expect(result).toBeNull();
      expect(init.status).toBe(200);
    });

    for (const status of [500, 502, 504, 0]) {
      it(`SSR, сбой API (${status}) — 503 с Retry-After и null`, async () => {
        const init: ResponseInit = {status: 200, headers: new Headers()};
        const result = await firstValueFrom(handlerFor('server', init)(httpError(status)));
        expect(result).toBeNull();
        expect(init.status).toBe(503);
        expect((init.headers as Headers).get('Retry-After')).toBe(String(PRODUCT_RETRY_AFTER_SECONDS));
        expect((init.headers as Headers).get('Cache-Control')).toBe('no-store');
      });
    }

    it('браузер — статус не трогает, просто null', async () => {
      const init: ResponseInit = {status: 200, headers: new Headers()};
      const result = await firstValueFrom(handlerFor('browser', init)(httpError(500)));
      expect(result).toBeNull();
      expect(init.status).toBe(200);
    });

    it('SSR без RESPONSE_INIT — не падает', async () => {
      const result = await firstValueFrom(handlerFor('server', null)(httpError(500)));
      expect(result).toBeNull();
    });
  });
});
