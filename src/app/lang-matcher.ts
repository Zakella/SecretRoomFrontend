import {UrlMatcher} from '@angular/router';

/** Языки сайта. Совпадает с LANGUAGES в server.ts. */
export const SITE_LANGUAGES: readonly string[] = ['ro', 'ru'];

/**
 * Первый сегмент URL — язык, но только ro или ru.
 *
 * Строковый ':lang' принимал что угодно: /en, /xx/contacts, /index.html рендерились
 * как живые страницы с кодом 200 (soft-404 и дубли в индексе). Всё, что не ro/ru,
 * уходит в верхнеуровневый '**' → Notfound (404). Параметр lang остаётся доступен
 * как раньше — через posParams.
 */
export const langMatcher: UrlMatcher = (segments) => {
  const first = segments[0];
  if (!first || !SITE_LANGUAGES.includes(first.path)) return null;
  return {consumed: [first], posParams: {lang: first}};
};
