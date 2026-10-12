import {extraOptionsCount, moreOptionsKey, pluralForm} from './option-count-label';

describe('option-count-label', () => {
  it('ru: границы форм', () => {
    const cases: Record<number, string> = {
      1: 'one', 2: 'few', 4: 'few', 5: 'many', 11: 'many', 12: 'many', 14: 'many',
      21: 'one', 22: 'few', 25: 'many', 101: 'one', 111: 'many', 112: 'many',
    };
    for (const [n, form] of Object.entries(cases)) {
      expect(pluralForm(+n, 'ru')).withContext(`ru ${n}`).toBe(form as 'one');
    }
  });

  it('ro: границы форм (20+ — «de»)', () => {
    const cases: Record<number, string> = {
      1: 'one', 2: 'few', 19: 'few', 20: 'many', 21: 'many', 100: 'many', 101: 'few', 119: 'few', 120: 'many',
    };
    for (const [n, form] of Object.entries(cases)) {
      expect(pluralForm(+n, 'ro')).withContext(`ro ${n}`).toBe(form as 'one');
    }
  });

  it('ключ по типу и форме, неизвестный/null тип — нейтральный', () => {
    expect(moreOptionsKey('COLOR', 3, 'ru')).toBe('MoreColorFew');
    expect(moreOptionsKey('SCENT', 5, 'ru')).toBe('MoreScentMany');
    expect(moreOptionsKey('SHADE', 1, 'ro')).toBe('MoreShadeOne');
    expect(moreOptionsKey('SHADE', 20, 'ro')).toBe('MoreShadeMany');
    expect(moreOptionsKey(null, 3, 'ro')).toBe('MoreVariantFew');
    expect(moreOptionsKey('WHATEVER', 2, 'ru')).toBe('MoreVariantFew');
    expect(moreOptionsKey(undefined, 1, 'ru')).toBe('MoreVariantOne');
  });

  it('extraOptionsCount: null, 0, 1, не число → нет плашки; N → N-1', () => {
    expect(extraOptionsCount(null)).toBeNull();
    expect(extraOptionsCount(undefined)).toBeNull();
    expect(extraOptionsCount(0)).toBeNull();
    expect(extraOptionsCount(1)).toBeNull();
    expect(extraOptionsCount(NaN)).toBeNull();
    expect(extraOptionsCount(2)).toBe(1);
    expect(extraOptionsCount(4)).toBe(3);
  });
});
