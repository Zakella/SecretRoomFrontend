import {TestBed} from '@angular/core/testing';
import {Router} from '@angular/router';
import {TranslocoService} from '@ngneat/transloco';
import {EMPTY} from 'rxjs';
import {Language} from './language';

describe('Language', () => {
  let service: Language;
  let routerSpy: jasmine.SpyObj<Router>;
  let translocoSpy: jasmine.SpyObj<TranslocoService>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate'], {url: '/ro/catalog', events: EMPTY});
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
      (Object.getOwnPropertyDescriptor(routerSpy, 'url')!.get as jasmine.Spy).and.returnValue('/ru/catalog');
      service.init();
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
      expect(routerSpy.navigate).toHaveBeenCalledWith(['', 'ru', 'catalog']);
    });
  });
});
