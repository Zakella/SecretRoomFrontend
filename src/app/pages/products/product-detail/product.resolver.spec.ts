import {PLATFORM_ID, RESPONSE_INIT} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRouteSnapshot, RedirectCommand, Router, RouterStateSnapshot, convertToParamMap, provideRouter} from '@angular/router';
import {Observable, firstValueFrom} from 'rxjs';
import {Product} from '../../../entities/product';
import {ProductResolver} from './product.resolver';

type Result = Product | RedirectCommand | null;

function routeFor(id: string, lang: string): ActivatedRouteSnapshot {
  return {
    paramMap: convertToParamMap({id}),
    pathFromRoot: [{paramMap: convertToParamMap({})}, {paramMap: convertToParamMap({lang})}],
  } as unknown as ActivatedRouteSnapshot;
}

const stateFor = (url: string) => ({url}) as RouterStateSnapshot;

describe('ProductResolver', () => {
  let http: HttpTestingController;
  let responseInit: ResponseInit & { headers: Headers };

  function setup(platform: 'server' | 'browser') {
    responseInit = {headers: new Headers({'Content-Type': 'text/html'})};
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: PLATFORM_ID, useValue: platform},
        ...(platform === 'server' ? [{provide: RESPONSE_INIT, useValue: responseInit}] : []),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    return TestBed.inject(ProductResolver);
  }

  const find = (id: string) => http.expectOne(r => r.url.endsWith(`/products/findProduct/${id}`));
  const redirect = (id: string) => http.expectOne(r => r.url.endsWith(`/products/redirect/${id}`));
  const notFound = {status: 404, statusText: 'Not Found'};
  const serverError = {status: 503, statusText: 'Unavailable'};

  afterEach(() => http.verify());

  function resolve(resolver: ProductResolver, id: string, lang: string, url: string): Promise<Result> {
    return firstValueFrom(resolver.resolve(routeFor(id, lang), stateFor(url)) as Observable<Result>);
  }

  describe('SSR', () => {
    it('активная карточка: отдаёт товар, запрос redirect не уходит, статус не трогаем', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/bra');
      find('5').flush({id: '5', name: 'Bra'});
      expect(await result).toEqual(jasmine.objectContaining({id: '5'}));
      http.expectNone(r => r.url.includes('/redirect/'));
      expect(responseInit.status).toBeUndefined();
    });

    for (const lang of ['ro', 'ru']) {
      it(`погашенная карточка (${lang}): 301 + Location на мастера со слагом, ?size= сохранён`, async () => {
        const resolver = setup('server');
        const result = resolve(resolver, '5', lang, `/${lang}/product/5/old-slug?size=M&variant=77`);
        find('5').flush(null, notFound);
        redirect('5').flush({redirectToAppId: 9});
        find('9').flush({id: '9', name: 'Бра Black Master'});
        expect(await result).toBeNull();
        expect(responseInit.status).toBe(301);
        expect(responseInit.headers.get('Location')).toBe(`/${lang}/product/9/bra-black-master?size=M&variant=77`);
      });
    }

    it('погашенная карточка без query: Location без хвоста', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/old');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 9});
      find('9').flush({id: '9', name: 'Master'});
      await result;
      expect(responseInit.headers.get('Location')).toBe('/ro/product/9/master');
    });

    it('неизвестный id: redirect 404 → null, статус не выставлен (404 ставит компонент)', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush(null, notFound);
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();
      expect(responseInit.headers.has('Location')).toBeFalse();
    });

    it('мастер не выгружен (findProduct мастера 404): не 301', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 9});
      find('9').flush(null, notFound);
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();
      expect(responseInit.headers.has('Location')).toBeFalse();
    });

    it('мастер без имени (нет слага) или redirect на себя: не 301', async () => {
      let resolver = setup('server');
      let result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 9});
      find('9').flush({id: '9'});
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();

      TestBed.resetTestingModule();
      resolver = setup('server');
      result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 5});
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();
    });

    it('findProduct 5xx: redirect не спрашиваем, не 301', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, serverError);
      expect(await result).toBeNull();
      http.expectNone(r => r.url.includes('/redirect/'));
      expect(responseInit.status).toBeUndefined();
    });

    it('redirect 5xx: не 301', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush(null, serverError);
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();
    });

    it('мастер 5xx: не 301', async () => {
      const resolver = setup('server');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 9});
      find('9').flush(null, serverError);
      expect(await result).toBeNull();
      expect(responseInit.status).toBeUndefined();
    });
  });

  describe('браузер', () => {
    it('погашенная карточка: RedirectCommand на мастера с replaceUrl и query', async () => {
      const resolver = setup('browser');
      const result = resolve(resolver, '5', 'ru', '/ru/product/5/old?size=M');
      find('5').flush(null, notFound);
      redirect('5').flush({redirectToAppId: 9});
      find('9').flush({id: '9', name: 'Master'});
      const value = await result;
      expect(value instanceof RedirectCommand).toBeTrue();
      const command = value as RedirectCommand;
      expect(TestBed.inject(Router).serializeUrl(command.redirectTo as never)).toBe('/ru/product/9/master?size=M');
      expect(command.navigationBehaviorOptions?.replaceUrl).toBeTrue();
    });

    it('redirect 404: null (страница «не найден»)', async () => {
      const resolver = setup('browser');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/x');
      find('5').flush(null, notFound);
      redirect('5').flush(null, notFound);
      expect(await result).toBeNull();
    });

    it('активная карточка: без запроса redirect', async () => {
      const resolver = setup('browser');
      const result = resolve(resolver, '5', 'ro', '/ro/product/5/bra');
      find('5').flush({id: '5', name: 'Bra'});
      expect(await result).toEqual(jasmine.objectContaining({id: '5'}));
      http.expectNone(r => r.url.includes('/redirect/'));
    });
  });
});
