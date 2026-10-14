/** Заглушки вместо размера; тот же список, что SizeUtils.IGNORED_SIZES на бэкенде (SR-168). */
const IGNORED_SIZES = new Set(['one', 'one size', 'o/s', 'os', 'na', 'n/a']);

/** Нормализованная подпись размера: trim + нижний регистр; заглушки и пустые значения дают ''. */
export function normalizedSizeLabel(size: string | null | undefined): string {
  const s = size?.trim().toLowerCase() ?? '';
  return IGNORED_SIZES.has(s) ? '' : s;
}

/** Есть ли у размера осмысленная подпись («236 ml» да; пусто, «One», «NA», «ONE SIZE», «O/S» нет). */
export function hasSizeLabel(size: string | null | undefined): boolean {
  return normalizedSizeLabel(size) !== '';
}
