import {Component} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {ViewportScroller} from '@angular/common';
import {provideRouter, Router} from '@angular/router';
import {KEEP_SCROLL_STATE, provideKeepScroll} from './keep-scroll';

@Component({template: ''})
class Page {}

describe('provideKeepScroll (SR-174)', () => {
  let router: Router;
  let original: jasmine.Spy;

  beforeEach(() => {
    original = jasmine.createSpy('scrollToPosition');
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          {path: 'a', component: Page},
          {path: 'b', component: Page},
          {path: 'c', component: Page},
        ]),
        {provide: ViewportScroller, useValue: {scrollToPosition: original}},
        provideKeepScroll(),
      ],
    });
    router = TestBed.inject(Router);
  });

  it('state.keepScroll: один вызов scrollToPosition пропущен, следующий проходит', async () => {
    await router.navigateByUrl('/a', {state: {[KEEP_SCROLL_STATE]: true}});
    const scroller = TestBed.inject(ViewportScroller);
    scroller.scrollToPosition([0, 0]);
    expect(original).not.toHaveBeenCalled();
    scroller.scrollToPosition([0, 0]);
    expect(original).toHaveBeenCalledTimes(1);
  });

  it('обычная навигация: прокрутка наверх не блокируется', async () => {
    await router.navigateByUrl('/b');
    TestBed.inject(ViewportScroller).scrollToPosition([0, 0]);
    expect(original).toHaveBeenCalledOnceWith([0, 0], undefined);
  });

  it('флаг сбрасывается следующей навигацией без state', async () => {
    await router.navigateByUrl('/a', {state: {[KEEP_SCROLL_STATE]: true}});
    await router.navigateByUrl('/c');
    TestBed.inject(ViewportScroller).scrollToPosition([0, 0]);
    expect(original).toHaveBeenCalledTimes(1);
  });
});
