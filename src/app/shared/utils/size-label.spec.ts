import {hasSizeLabel} from './size-label';

describe('hasSizeLabel', () => {
  it('пусто, null, undefined, пробелы: нет подписи', () => {
    for (const v of [null, undefined, '', '   ']) expect(hasSizeLabel(v)).toBeFalse();
  });

  it('заглушки без учёта регистра и пробелов: нет подписи', () => {
    for (const v of ['One', 'ONE', 'NA', 'na', 'N/A', 'ONE SIZE', 'one size', ' o/s ', 'OS']) {
      expect(hasSizeLabel(v)).withContext(v).toBeFalse();
    }
  });

  it('реальные размеры и объёмы: подпись есть', () => {
    for (const v of ['S', 'XL', '236 ml', '6.5 oz/ 185 g', 'One Plus']) {
      expect(hasSizeLabel(v)).withContext(v).toBeTrue();
    }
  });
});
