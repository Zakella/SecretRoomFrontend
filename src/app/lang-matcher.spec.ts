import {Route, UrlSegment, UrlSegmentGroup} from '@angular/router';
import {langMatcher, SITE_LANGUAGES} from './lang-matcher';

describe('langMatcher', () => {
  const route = {} as Route;
  const group = new UrlSegmentGroup([], {});
  const segs = (...paths: string[]) => paths.map(p => new UrlSegment(p, {}));

  it('принимает только ro и ru', () => {
    expect([...SITE_LANGUAGES]).toEqual(['ro', 'ru']);
  });

  for (const lang of ['ro', 'ru']) {
    it(`/${lang}/... — забирает один сегмент и отдаёт его как параметр lang`, () => {
      const segments = segs(lang, 'catalog', 'sutiene');
      const result = langMatcher(segments, group, route);
      expect(result).not.toBeNull();
      expect(result!.consumed).toEqual([segments[0]]);
      expect(result!.posParams!['lang'].path).toBe(lang);
    });
  }

  it('/ro без продолжения — тоже язык', () => {
    const result = langMatcher(segs('ro'), group, route);
    expect(result?.posParams?.['lang'].path).toBe('ro');
  });

  for (const path of ['en', 'xx', 'RO', 'Ru', 'index.html', 'catalog', '']) {
    it(`"${path}" — не язык`, () => {
      expect(langMatcher(segs(path, 'contacts'), group, route)).toBeNull();
    });
  }

  it('пустой путь — не язык', () => {
    expect(langMatcher([], group, route)).toBeNull();
  });
});
