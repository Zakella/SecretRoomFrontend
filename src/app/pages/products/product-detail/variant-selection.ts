import {ProductVariant} from '../../../entities/product-variant';
import {hasSizeLabel, normalizedSizeLabel} from '../../../shared/utils/size-label';

/**
 * Предвыбор варианта по размеру, перенесённому со свотча соседней карточки (?size=).
 * Сравнение без регистра; вариант должен быть available && inStock. Иначе undefined — тогда работает прежняя логика.
 */
export function findVariantBySize(variants: ProductVariant[] | undefined, size: string | null | undefined): ProductVariant | undefined {
  const wanted = size?.trim().toLowerCase();
  if (!wanted || !variants?.length) return undefined;
  return variants.find(v => v.size?.trim().toLowerCase() === wanted && v.available && v.inStock);
}

/** Подпись размера варианта: null/undefined/пробелы и заглушки (One, NA, ONE SIZE, O/S...) дают пустую строку. */
export function sizeLabel(variant: ProductVariant): string {
  return hasSizeLabel(variant.size) ? variant.size!.trim() : '';
}

/**
 * Варианты, у которых есть подпись размера (SR-168). Блок «Размер» рисуется только при двух и более таких вариантах:
 * вариант с пустым size не должен превращаться в пустую плашку.
 */
export function sizedVariants(variants: ProductVariant[] | undefined): ProductVariant[] {
  return (variants ?? []).filter(v => sizeLabel(v) !== '');
}

/** Выбор есть, если различных подписей не меньше двух (две одинаковые «236 ml» выбором не считаются). */
export function hasSizeChoice(variants: ProductVariant[] | undefined): boolean {
  return new Set(sizedVariants(variants).map(v => normalizedSizeLabel(v.size))).size >= 2;
}

/**
 * Вариант по умолчанию (SR-168).
 * Выбора размера нет (блок скрыт): вариант самой страницы по ownAppId, если он в наличии; иначе первый доступный; иначе свой (нет в наличии нигде).
 * Выбор есть: первый доступный среди вариантов с подписью (безымянные не кликабельны, предвыбирать их нельзя).
 */
export function pickInitialVariant(variants: ProductVariant[] | undefined, ownAppId: string | number | null | undefined): ProductVariant | undefined {
  if (!variants?.length) return undefined;
  const firstAvailable = (list: ProductVariant[]) => list.find(v => v.available && v.inStock) ?? list[0];
  if (hasSizeChoice(variants)) return firstAvailable(sizedVariants(variants));
  const own = ownAppId == null || ownAppId === '' ? undefined : variants.find(v => String(v.appId) === String(ownAppId));
  if (own && own.available && own.inStock) return own;
  return variants.find(v => v.available && v.inStock) ?? own ?? variants[0];
}
