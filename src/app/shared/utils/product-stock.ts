import {Product} from '../../entities/product';

/**
 * Товар нельзя купить: снят с продажи или нет остатка (по вариантам, если они есть).
 * SR-181: распроданные карточки модели открываются по прямой ссылке, но не должны попадать
 * в «недавно просмотренные». Та же логика, что в product-detail.
 */
export function isProductOutOfStock(p: Pick<Product, 'discontinued' | 'variants' | 'unitsInStock'>): boolean {
  if (p.discontinued) return true;
  if (p.variants?.length) {
    return !p.variants.some(v => v.available && v.unitsInStock && v.unitsInStock > 0);
  }
  return (p.unitsInStock ?? 0) <= 0;
}
