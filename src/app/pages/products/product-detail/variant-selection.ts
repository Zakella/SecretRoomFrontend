import {ProductVariant} from '../../../entities/product-variant';

/**
 * Предвыбор варианта по размеру, перенесённому со свотча соседней карточки (?size=).
 * Сравнение без регистра; вариант должен быть available && inStock. Иначе undefined — тогда работает прежняя логика.
 */
export function findVariantBySize(variants: ProductVariant[] | undefined, size: string | null | undefined): ProductVariant | undefined {
  const wanted = size?.trim().toLowerCase();
  if (!wanted || !variants?.length) return undefined;
  return variants.find(v => v.size?.trim().toLowerCase() === wanted && v.available && v.inStock);
}
