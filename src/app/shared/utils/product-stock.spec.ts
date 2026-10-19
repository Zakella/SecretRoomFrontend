import {Product} from '../../entities/product';
import {ProductVariant} from '../../entities/product-variant';
import {isProductOutOfStock} from './product-stock';

describe('isProductOutOfStock', () => {
  const p = (x: Partial<Product>) => x as Product;
  const v = (x: Partial<ProductVariant>) => x as ProductVariant;

  it('снят с продажи - да', () => {
    expect(isProductOutOfStock(p({discontinued: true, unitsInStock: 5}))).toBeTrue();
  });
  it('без вариантов: по unitsInStock', () => {
    expect(isProductOutOfStock(p({unitsInStock: 0}))).toBeTrue();
    expect(isProductOutOfStock(p({}))).toBeTrue();
    expect(isProductOutOfStock(p({unitsInStock: 2}))).toBeFalse();
  });
  it('с вариантами: нужен хотя бы один доступный с остатком', () => {
    expect(isProductOutOfStock(p({unitsInStock: 9, variants: [v({available: false, unitsInStock: 0})]}))).toBeTrue();
    expect(isProductOutOfStock(p({variants: [v({available: false, unitsInStock: 0}), v({available: true, unitsInStock: 1})]}))).toBeFalse();
  });
});
