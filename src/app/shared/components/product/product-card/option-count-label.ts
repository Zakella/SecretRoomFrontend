export type PluralForm = 'one' | 'few' | 'many';

/**
 * Форма множественного числа по правилам CLDR для целого n >= 0.
 * ru: one (1, 21, 101; но не 11), few (2-4, 22-24; но не 12-14), many (остальное).
 * ro: one (1), few (0 и n%100 в 1..19, напр. 2-19, 101, 119), many (20+ → «de culori»).
 */
export function pluralForm(n: number, lang: string): PluralForm {
  const abs = Math.abs(Math.trunc(n));
  if (lang === 'ru') {
    const mod10 = abs % 10;
    const mod100 = abs % 100;
    if (mod10 === 1 && mod100 !== 11) return 'one';
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
    return 'many';
  }
  if (abs === 1) return 'one';
  const mod100 = abs % 100;
  return abs === 0 || (mod100 >= 1 && mod100 <= 19) ? 'few' : 'many';
}

function typeSuffix(optionType: string | null | undefined): string {
  switch (optionType) {
    case 'COLOR': return 'Color';
    case 'SCENT': return 'Scent';
    case 'SHADE': return 'Shade';
    default: return 'Variant';
  }
}

/** Число «других» вариантов на плитке: optionCount включает саму карточку. null — плашку не показываем. */
export function extraOptionsCount(optionCount: number | null | undefined): number | null {
  if (typeof optionCount !== 'number' || !Number.isFinite(optionCount) || optionCount <= 1) return null;
  return Math.trunc(optionCount) - 1;
}

/** Ключ i18n плашки «+N цветов»: MoreColorOne / MoreColorFew / MoreColorMany (аналогично Scent, Shade, Variant). */
export function moreOptionsKey(optionType: string | null | undefined, extra: number, lang: string): string {
  const form = pluralForm(extra, lang);
  return `More${typeSuffix(optionType)}${form[0].toUpperCase()}${form.slice(1)}`;
}
