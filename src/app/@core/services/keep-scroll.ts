import {EnvironmentProviders, inject, provideEnvironmentInitializer} from '@angular/core';
import {ViewportScroller} from '@angular/common';
import {NavigationCancel, NavigationError, NavigationStart, Router} from '@angular/router';

/** Ключ в state навигации (routerLink [state]): после перехода не прокручивать страницу наверх. */
export const KEEP_SCROLL_STATE = 'keepScroll';

/**
 * Переход между вариантами одной модели (SR-174) сохраняет позицию прокрутки.
 * Роутер с scrollPositionRestoration:'top' после каждой навигации зовёт ViewportScroller.scrollToPosition([0,0]);
 * для навигации с state.keepScroll этот один вызов пропускаем. Обычные переходы и «назад» работают как раньше.
 */
export function provideKeepScroll(): EnvironmentProviders {
  return provideEnvironmentInitializer(() => {
    const router = inject(Router);
    const scroller = inject(ViewportScroller);
    let skipNext = false;

    router.events.subscribe(event => {
      if (event instanceof NavigationStart) {
        const state = router.getCurrentNavigation()?.extras.state;
        skipNext = event.navigationTrigger === 'imperative' && state?.[KEEP_SCROLL_STATE] === true;
      } else if (event instanceof NavigationCancel || event instanceof NavigationError) {
        skipNext = false;
      }
    });

    const original = scroller.scrollToPosition.bind(scroller);
    scroller.scrollToPosition = (position: [number, number], options?: {behavior: ScrollBehavior}) => {
      if (skipNext) {
        skipNext = false;
        return;
      }
      original(position, options);
    };
  });
}
