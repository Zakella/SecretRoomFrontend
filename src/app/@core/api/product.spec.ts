import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ProductService} from './product';
import {SKIP_LOADER} from '../interceptors/loader-interceptor';

describe('ProductService.getProductById (SR-173)', () => {
  let service: ProductService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(ProductService);
    http = TestBed.inject(HttpTestingController);
  });

  it('silent=true выставляет SKIP_LOADER в контексте и не добавляет заголовков', () => {
    service.getProductById('1', true).subscribe();
    const req = http.expectOne(r => r.url.endsWith('/findProduct/1'));
    expect(req.request.context.get(SKIP_LOADER)).toBeTrue();
    expect(req.request.headers.keys()).toEqual([]);
  });

  it('по умолчанию SKIP_LOADER=false', () => {
    service.getProductById('2').subscribe();
    const req = http.expectOne(r => r.url.endsWith('/findProduct/2'));
    expect(req.request.context.get(SKIP_LOADER)).toBeFalse();
  });
});
