import {TestBed} from '@angular/core/testing';
import {NavigationEnd, Router} from '@angular/router';
import {TranslocoService} from '@ngneat/transloco';
import {Subject} from 'rxjs';
import {Language} from './language';

describe('Language', () => {
  let service: Language;
  let routerSpy: jasmine.SpyObj<Router>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;
  let events: Subject<NavigationEnd>;

  /** Подменяет router.url — он объявлен геттером, обычный присваиванием не перебить. */
  function setUrl(url: string): void {
    (Object.getOwnPropertyDescriptor(routerSpy, 'url')!.get as jasmine.Spy).and.returnValue(url);
  }

  beforeEach(() => {
    events = new Subject<NavigationEnd>();
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], {url: '/ro/catalog', events});
    translocoSpy = jasmine.createSpyObj('TranslocoService', ['setActiveLang']);

    TestBed.configureTestingModule({
      providers: [
        Language,
        {provide: Router, useValue: routerSpy},
        {provide: TranslocoService, useValue: translocoSpy},
      ],
    });
    service = TestBed.inject(Language);
  });

  it('should default to "ro"', () => {
    expect(service.currentLanguage()).toBe('ro');
  });

  describe('init', () => {
    it('should detect language from URL and keep current if same', () => {
      service.init();
      // URL is /ro/catalog, default is 'ro' — no change needed
      expect(service.currentLanguage()).toBe('ro');
    });

    it('should sync language when URL has different lang', () => {
      setUrl('/ru/catalog');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ru');
    });
  });

  /**
   * Регрессия: русская главная отдавалась по-румынски, если к адресу приклеен query-параметр.
   * Язык брался как url.split('/')[1], и для «/ru?fbclid=abc» это давало «ru?fbclid=abc» —
   * такого языка нет, transloco откатывался на язык по умолчанию. На вложенных путях параметр
   * попадает в последний сегмент и потому не мешал, поэтому ломалась ровно главная — та самая
   * страница, на которую приходит внешний трафик: Facebook и Instagram дописывают ?fbclid=
   * к каждой ссылке, реклама несёт ?utm_*.
   */
  describe('определение языка по URL со строкой запроса', () => {
    it('«/ru» — русский', () => {
      setUrl('/ru');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
    });

    it('«/ro» — румынский', () => {
      service.syncLanguageFromUrl('ru'); // уйти с языка по умолчанию, иначе проверка холостая
      setUrl('/ro');
      service.init();
      expect(service.currentLanguage()).toBe('ro');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ro');
    });

    it('«/ru?fbclid=abc123» — русский, параметр Facebook не ломает язык', () => {
      setUrl('/ru?fbclid=abc123');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ru');
    });

    it('«/ru?utm_source=instagram» — русский, рекламная метка не ломает язык', () => {
      setUrl('/ru?utm_source=instagram');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
    });

    it('«/ro?fbclid=abc123» — румынский с параметром', () => {
      service.syncLanguageFromUrl('ru');
      setUrl('/ro?fbclid=abc123');
      service.init();
      expect(service.currentLanguage()).toBe('ro');
    });

    it('«/ru/brands?fbclid=abc» — вложенный путь остаётся русским', () => {
      setUrl('/ru/brands?fbclid=abc');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
    });

    it('якорь тоже отрезается: «/ru#section»', () => {
      setUrl('/ru#section');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
    });

    it('несколько параметров: «/ru?utm_source=fb&utm_medium=cpc»', () => {
      setUrl('/ru?utm_source=fb&utm_medium=cpc');
      service.init();
      expect(service.currentLanguage()).toBe('ru');
    });

    it('корень «/» — фолбэк на ro', () => {
      setUrl('/');
      service.init();
      expect(service.currentLanguage()).toBe('ro');
    });

    it('неизвестный язык «/en/catalog» — остаётся ro', () => {
      setUrl('/en/catalog');
      service.init();
      expect(service.currentLanguage()).toBe('ro');
      expect(translocoSpy.setActiveLang).not.toHaveBeenCalled();
    });

    it('навигация внутри приложения: NavigationEnd на «/ru?fbclid=x» даёт русский', () => {
      setUrl('/ro');
      service.init();
      events.next(new NavigationEnd(1, '/ru?fbclid=x', '/ru?fbclid=x'));
      expect(service.currentLanguage()).toBe('ru');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ru');
    });
  });

  describe('syncLanguageFromUrl', () => {
    it('should sync valid language', () => {
      service.syncLanguageFromUrl('ru');
      expect(service.currentLanguage()).toBe('ru');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ru');
    });

    it('should ignore invalid language', () => {
      service.syncLanguageFromUrl('en');
      expect(service.currentLanguage()).toBe('ro');
    });

    it('should not update if already same language', () => {
      service.syncLanguageFromUrl('ro');
      expect(translocoSpy.setActiveLang).not.toHaveBeenCalled();
    });
  });

  describe('setLanguage', () => {
    it('should set language and navigate', () => {
      service.setLanguage('ru');
      expect(service.currentLanguage()).toBe('ru');
      expect(translocoSpy.setActiveLang).toHaveBeenCalledWith('ru');
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['', 'ru', 'catalog'],
        {queryParamsHandling: 'preserve'},
      );
    });

    /**
     * Тот же дефект с другой стороны: путь резался по «/» вместе со строкой запроса,
     * поэтому переключение языка на странице с фильтрами давало несуществующий
     * последний сегмент вида «vs?page=2».
     */
    it('строка запроса не уезжает в последний сегмент пути', () => {
      setUrl('/ru/catalog/vs?page=2&sort=price');
      service.setLanguage('ro');
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['', 'ro', 'catalog', 'vs'],
        {queryParamsHandling: 'preserve'},
      );
    });

    it('якорь тоже не попадает в сегмент', () => {
      setUrl('/ru/brands#top');
      service.setLanguage('ro');
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['', 'ro', 'brands'],
        {queryParamsHandling: 'preserve'},
      );
    });

    it('переключение на главной с параметром даёт чистый «/ro»', () => {
      setUrl('/ru?fbclid=abc');
      service.setLanguage('ro');
      expect(routerSpy.navigate).toHaveBeenCalledWith(
        ['', 'ro'],
        {queryParamsHandling: 'preserve'},
      );
    });
  });
});
