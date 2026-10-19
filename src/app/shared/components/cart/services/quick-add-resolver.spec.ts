import {Product} from '../../../../entities/product';
import {ProductVariant} from '../../../../entities/product-variant';
import {isMeaningfulSize, resolveQuickAdd} from './quick-add-resolver';

const v = (appId: number, size: string | undefined, inStock = true): ProductVariant =>
  ({appId, size, available: inStock, inStock, unitsInStock: inStock ? 3 : 0});
const product = (p: Partial<Product>): Product => ({id: '1', ...p} as Product);

describe('resolveQuickAdd', () => {
  it('bra with 7 sizes asks for a size, sorted, one unavailable', () => {
    const r = resolveQuickAdd(product({variants: [
      v(7, '85C'), v(1, '80C'), v(2, '70A'), v(3, '85B', false), v(4, '75D'), v(5, '70B'), v(6, '80B'),
    ]}));
    expect(r.kind).toBe('choose');
    if (r.kind !== 'choose') return;
    expect(r.options.map(o => o.size)).toEqual(['70A', '70B', '75D', '80B', '80C', '85B', '85C']);
    expect(r.options.filter(o => !o.available).map(o => o.size)).toEqual(['85B']);
    expect(r.options[0].variantAppId).toBe(2);
  });

  it('sorts XS < S < M < L and 70A < 75B', () => {
    const a = resolveQuickAdd(product({variants: [v(1, 'L'), v(2, 'XS', false), v(3, 'M'), v(4, 'S')]}));
    const b = resolveQuickAdd(product({variants: [v(1, '75B'), v(2, '70A')]}));
    expect(a.kind === 'choose' && a.options.map(o => o.size)).toEqual(['XS', 'S', 'M', 'L']);
    expect(b.kind === 'choose' && b.options.map(o => o.size)).toEqual(['70A', '75B']);
  });

  it('perfume "250 ml" + "One" adds 250 ml right away', () => {
    expect(resolveQuickAdd(product({variants: [v(10, '250 ml'), v(11, 'One', false)]})))
      .toEqual({kind: 'add', size: '250 ml', variantAppId: 10});
  });

  it('single variant adds right away', () => {
    expect(resolveQuickAdd(product({variants: [v(5, 'M')]}))).toEqual({kind: 'add', size: 'M', variantAppId: 5});
  });

  it('one-size / blank variant is added without size but with appId', () => {
    expect(resolveQuickAdd(product({variants: [v(5, 'One Size')]}))).toEqual({kind: 'add', size: undefined, variantAppId: 5});
    expect(resolveQuickAdd(product({variants: [v(6, '  ')]}))).toEqual({kind: 'add', size: undefined, variantAppId: 6});
  });

  it('nothing in stock adds nothing', () => {
    expect(resolveQuickAdd(product({variants: [v(5, 'M', false)]})).kind).toBe('none');
  });

  it('collapses duplicate sizes, preferring the one in stock', () => {
    const r = resolveQuickAdd(product({variants: [v(1, 'M', false), v(2, 'M'), v(3, 'L')]}));
    expect(r.kind === 'choose' && r.options).toEqual([
      {size: 'M', variantAppId: 2, available: true},
      {size: 'L', variantAppId: 3, available: true},
    ]);
  });

  it('legacy productSizes: 2 -> choose, 1 -> add', () => {
    const two = resolveQuickAdd(product({productSizes: [{sizeType: 'M', available: true}, {sizeType: 'S', available: false}]}));
    expect(two).toEqual({kind: 'choose', options: [
      {size: 'S', available: false}, {size: 'M', available: true},
    ]});
    expect(resolveQuickAdd(product({productSizes: [{sizeType: 'M', available: true}]}))).toEqual({kind: 'add', size: 'M'});
  });

  it('no variants and no sizes adds without size', () => {
    expect(resolveQuickAdd(product({}))).toEqual({kind: 'add'});
    expect(resolveQuickAdd(product({variants: [], productSizes: []}))).toEqual({kind: 'add'});
    expect(resolveQuickAdd(product({size: 'One'}))).toEqual({kind: 'add'});
  });

  it('SR-181: card without variants and with zero stock adds nothing', () => {
    expect(resolveQuickAdd(product({unitsInStock: 0})).kind).toBe('none');
    expect(resolveQuickAdd(product({inStock: false, unitsInStock: 0, size: 'XS'})).kind).toBe('none');
    expect(resolveQuickAdd(product({inStock: false})).kind).toBe('none');
    expect(resolveQuickAdd(product({unitsInStock: 0, productSizes: [{sizeType: 'M', available: true}]})).kind).toBe('none');
  });

  it('SR-181: card without variants and with stock still adds', () => {
    expect(resolveQuickAdd(product({inStock: true, unitsInStock: 2}))).toEqual({kind: 'add'});
  });

  it('standalone card without variants keeps its own size', () => {
    expect(resolveQuickAdd(product({size: ' XS ', variants: [], productSizes: []}))).toEqual({kind: 'add', size: 'XS'});
  });

  it('isMeaningfulSize ignores one-size markers case-insensitively', () => {
    for (const s of ['one', 'One Size', 'ONESIZE', 'os', 'O/S', 'u', 'Uni', 'unica', 'Unic', '', ' ', undefined]) {
      expect(isMeaningfulSize(s)).toBeFalse();
    }
    expect(isMeaningfulSize('M')).toBeTrue();
  });
});
