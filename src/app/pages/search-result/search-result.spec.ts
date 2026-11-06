import {TestBed} from '@angular/core/testing';
import {ActivatedRoute, convertToParamMap, ParamMap, provideRouter} from '@angular/router';
import {PLATFORM_ID, signal} from '@angular/core';
import {BehaviorSubject, Observable, of, Subject, throwError} from 'rxjs';
import {provideTransloco} from '@ngneat/transloco';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {SearchResult} from './search-result';
import {ProductService} from '../../@core/api/product';
import {SiteTracker} from '../../@core/api/site-tracker';
import {GoogleAnalytics} from '../../@core/services/google-analytics';
import {MetaService} from '../../@core/services/meta.service';
import {Language} from '../../@core/services/language';
import {GetResponse} from '../../entities/get-response';
import {Product} from '../../entities/product';

describe('SearchResult: SEARCH_RESULT tracking (SR-215)', () => {
  let params: BehaviorSubject<ParamMap>;
  let smartSearch: jasmine.Spy;
  let searchResult: jasmine.Spy;

  const page = (total: number, n = 12) =>
    ({content: Array.from({length: n}, (_, i) => ({id: String(i)} as Product)), totalElements: total} as unknown as GetResponse);

  function configure() {
    TestBed.configureTestingModule({
      imports: [SearchResult],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideTransloco({config: {availableLangs: ['ru'], defaultLang: 'ru', prodMode: true}}),
        {provide: PLATFORM_ID, useValue: 'browser'},
        {provide: ActivatedRoute, useValue: {paramMap: params}},
        {provide: ProductService, useValue: {smartSearch}},
        {provide: SiteTracker, useValue: {searchResult}},
        {provide: GoogleAnalytics, useValue: {send: () => undefined}},
        {provide: MetaService, useValue: {updateTitle: () => undefined, updateDescription: () => undefined}},
        {provide: Language, useValue: {currentLanguage: signal('ru')}},
      ],
    });
  }

  function create(...responses: Observable<GetResponse>[]) {
    params = new BehaviorSubject(convertToParamMap({query: 'rochie verde'}));
    smartSearch = jasmine.createSpy('smartSearch').and.returnValues(...responses);
    searchResult = jasmine.createSpy('searchResult');
    configure();
    const fixture = TestBed.createComponent(SearchResult);
    fixture.detectChanges();
    return fixture;
  }

  it('first response → tracker gets the query and totalElements', () => {
    const f = create(of(page(25)));
    expect(smartSearch).toHaveBeenCalledOnceWith('rochie verde', 0, 12);
    expect(searchResult).toHaveBeenCalledOnceWith('rochie verde', 25);
    expect(f.componentInstance.totalElements()).toBe(25);
  });

  it('nothing found → resultsCount 0', () => {
    create(of(page(0, 0)));
    expect(searchResult).toHaveBeenCalledOnceWith('rochie verde', 0);
  });

  it('204 with an empty body (API: nothing found) → resultsCount 0', () => {
    create(of(null as unknown as GetResponse));
    expect(searchResult).toHaveBeenCalledOnceWith('rochie verde', 0);
  });

  it('"show more" (next pages) does not send again', () => {
    const f = create(of(page(30)), of(page(30)), of(page(30, 6)));
    f.componentInstance.loadMore();
    f.componentInstance.loadMore();
    expect(smartSearch.calls.allArgs().map(a => a[1])).toEqual([0, 1, 2]);
    expect(searchResult).toHaveBeenCalledTimes(1);
    expect(f.componentInstance.products().length).toBe(30);
  });

  it('a new query sends once more, with its own count', () => {
    create(of(page(25)), of(page(3, 3)));
    params.next(convertToParamMap({query: 'bra'}));
    expect(searchResult.calls.allArgs()).toEqual([['rochie verde', 25], ['bra', 3]]);
  });

  it('a late response of the previous query is not sent', () => {
    const late = new Subject<GetResponse>();
    create(late, of(page(3, 3)));
    params.next(convertToParamMap({query: 'bra'}));
    late.next(page(25));
    late.complete();
    expect(searchResult.calls.allArgs()).toEqual([['bra', 3]]);
  });

  it('search error → not sent, the page keeps working', () => {
    const f = create(throwError(() => ({status: 500})));
    expect(searchResult).not.toHaveBeenCalled();
    expect(f.componentInstance.loading()).toBeFalse();
  });

  it('empty query → no search, not sent', () => {
    params = new BehaviorSubject(convertToParamMap({query: '  '}));
    smartSearch = jasmine.createSpy('smartSearch');
    searchResult = jasmine.createSpy('searchResult');
    configure();
    TestBed.createComponent(SearchResult).detectChanges();
    expect(smartSearch).not.toHaveBeenCalled();
    expect(searchResult).not.toHaveBeenCalled();
  });

  it('tracker throws → the page still shows the results', () => {
    const f = create(of(page(25)), of(page(25)));
    searchResult.and.throwError('boom');
    expect(() => params.next(convertToParamMap({query: 'bra'}))).not.toThrow();
    f.detectChanges();
    expect(f.componentInstance.products().length).toBe(12);
    expect(f.componentInstance.totalElements()).toBe(25);
    expect(f.componentInstance.loading()).toBeFalse();
    expect(f.componentInstance.hasMore()).toBeTrue();
  });
});
