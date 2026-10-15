import {ProductVariant} from '../../../entities/product-variant';
import {findVariantBySize, hasSizeChoice, pickInitialVariant, sizedVariants} from './variant-selection';

describe('findVariantBySize', () => {
  const variants: ProductVariant[] = [
    {appId: 1, size: 'S', available: true, inStock: true},
    {appId: 2, size: 'M', available: true, inStock: false},
    {appId: 3, size: 'L', available: false, inStock: true},
    {appId: 4, size: 'XL', available: true, inStock: true},
  ];

  it('находит вариант с тем же размером без учёта регистра', () => {
    expect(findVariantBySize(variants, 'xl')?.appId).toBe(4);
    expect(findVariantBySize(variants, ' s ')?.appId).toBe(1);
  });

  it('откат (undefined), если размера нет у соседа', () => {
    expect(findVariantBySize(variants, 'XXL')).toBeUndefined();
  });

  it('откат, если размер без остатка или недоступен', () => {
    expect(findVariantBySize(variants, 'M')).toBeUndefined();
    expect(findVariantBySize(variants, 'L')).toBeUndefined();
  });

  it('откат при пустом size или вариантах', () => {
    expect(findVariantBySize(variants, null)).toBeUndefined();
    expect(findVariantBySize(variants, '')).toBeUndefined();
    expect(findVariantBySize(undefined, 'S')).toBeUndefined();
    expect(findVariantBySize([], 'S')).toBeUndefined();
  });
});

describe('sizedVariants / hasSizeChoice (SR-168)', () => {
  const mk = (...sizes: (string | null | undefined)[]): ProductVariant[] =>
    sizes.map((size, i) => ({appId: i + 1, size: size as string, available: true, inStock: true}));

  it('(a) ["", "6.5 oz/ 185 g"]: блок «Размер» не рисуется', () => {
    const v = mk('', '6.5 oz/ 185 g');
    expect(sizedVariants(v).map(x => x.size)).toEqual(['6.5 oz/ 185 g']);
    expect(hasSizeChoice(v)).toBeFalse();
  });

  it('(b) ["S","M",""]: две плашки, пустой нет', () => {
    const v = mk('S', 'M', '');
    expect(sizedVariants(v).map(x => x.size)).toEqual(['S', 'M']);
    expect(hasSizeChoice(v)).toBeTrue();
  });

  it('(c) ["S","M"]: две плашки (регрессия)', () => {
    const v = mk('S', 'M');
    expect(sizedVariants(v).length).toBe(2);
    expect(hasSizeChoice(v)).toBeTrue();
  });

  it('(d) один вариант с размером: блока нет', () => {
    expect(hasSizeChoice(mk('M'))).toBeFalse();
  });

  it('пробелы, null и undefined считаются пустыми', () => {
    const v = mk('  ', null, undefined, 'S', 'M');
    expect(sizedVariants(v).map(x => x.size)).toEqual(['S', 'M']);
    expect(hasSizeChoice(mk('  ', null, 'S'))).toBeFalse();
  });

  it('нет вариантов: блока нет', () => {
    expect(hasSizeChoice(undefined)).toBeFalse();
    expect(hasSizeChoice([])).toBeFalse();
  });

  it('заглушки NA, One, ONE SIZE, " o/s " не подпись, "236 ml" подпись', () => {
    expect(sizedVariants(mk('NA', 'One', 'ONE SIZE', ' o/s ')).length).toBe(0);
    expect(sizedVariants(mk('236 ml')).map(x => x.size)).toEqual(['236 ml']);
  });

  it('["236 ml","NA"]: блока нет', () => {
    expect(hasSizeChoice(mk('236 ml', 'NA'))).toBeFalse();
  });

  it('["One","One"]: блока нет', () => {
    expect(hasSizeChoice(mk('One', 'One'))).toBeFalse();
  });

  it('["368 ml","One","One"]: блока нет', () => {
    expect(hasSizeChoice(mk('368 ml', 'One', 'One'))).toBeFalse();
  });

  it('["S","M","One"]: две плашки', () => {
    const v = mk('S', 'M', 'One');
    expect(sizedVariants(v).map(x => x.size)).toEqual(['S', 'M']);
    expect(hasSizeChoice(v)).toBeTrue();
  });

  it('одинаковые подписи ["236 ml","236 ml"]: различных одна, блока нет', () => {
    expect(hasSizeChoice(mk('236 ml', '236 ML'))).toBeFalse();
  });
});

describe('pickInitialVariant (SR-168)', () => {
  const v = (appId: number, size: string, ok = true): ProductVariant => ({appId, size, available: ok, inStock: ok});

  it('(a) ["" own 3331, "6.5 oz" 2700]: берёт собственный 3331', () => {
    expect(pickInitialVariant([v(2700, '6.5 oz/ 185 g'), v(3331, '')], '3331')?.appId).toBe(3331);
  });

  it('(b) S, M, L own=M: прежнее поведение, первый доступный', () => {
    expect(pickInitialVariant([v(1, 'S'), v(2, 'M'), v(3, 'L')], '2')?.appId).toBe(1);
    expect(pickInitialVariant([v(1, 'S', false), v(2, 'M'), v(3, 'L')], '3')?.appId).toBe(2);
  });

  it('(c) S, M, "" own="": выбирает размерный, не пустой', () => {
    expect(pickInitialVariant([v(1, 'S'), v(2, 'M'), v(3, '')], '3')?.appId).toBe(1);
    expect(pickInitialVariant([v(1, 'S', false), v(2, 'M', false), v(3, '')], '3')?.appId).toBe(1);
  });

  it('(d) нет совпадения own: первый доступный', () => {
    expect(pickInitialVariant([v(1, 'M', false), v(2, 'L')], '99')?.appId).toBe(2);
    expect(pickInitialVariant([v(1, 'M', false), v(2, 'L')], undefined)?.appId).toBe(2);
    expect(pickInitialVariant([], '1')).toBeUndefined();
  });

  it('(e) своя карточка без остатка, соседний вариант в наличии: берёт доступный', () => {
    expect(pickInitialVariant([v(3875, '236 ml', false), v(3874, 'NA')], '3875')?.appId).toBe(3874);
    expect(pickInitialVariant([v(1619, 'S', false), v(1620, 'S')], '1619')?.appId).toBe(1620);
    expect(pickInitialVariant([v(3295, '75B', false), v(3298, '75B')], '3295')?.appId).toBe(3298);
  });

  it('(f) свой в наличии, сосед тоже: остаётся свой', () => {
    expect(pickInitialVariant([v(1619, 'S'), v(1620, 'S')], '1620')?.appId).toBe(1620);
  });

  it('(g) нигде нет в наличии: свой вариант', () => {
    expect(pickInitialVariant([v(1619, 'S', false), v(1620, 'S', false)], '1620')?.appId).toBe(1620);
  });
});
