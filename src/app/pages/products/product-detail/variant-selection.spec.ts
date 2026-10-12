import {ProductVariant} from '../../../entities/product-variant';
import {findVariantBySize} from './variant-selection';

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
