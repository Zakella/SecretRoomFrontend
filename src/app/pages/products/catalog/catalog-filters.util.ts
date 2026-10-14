import {FilterGroup, FilterGroupValue} from '../../../entities/filter-group';

/** Ключ раздела «Бренд» среди слагов групп (слаг группы с бэка таким быть не может). */
export const BRAND_SECTION_KEY = '__brand';

/** Сколько значений раздела видно до «Ещё N». */
export const VISIBLE_VALUES_LIMIT = 6;

/** Сколько первых видимых разделов раскрыто по умолчанию. */
export const DEFAULT_OPEN_SECTIONS = 2;

/** Порядок разделов: тип → бренд → размер → объём → цвет → цена; остальные — после, как у бэка. */
const SECTION_ORDER = ['product-type', BRAND_SECTION_KEY, 'size', 'volume', 'color', 'price'];

export interface BrandOption {
  brand: string;
  brandAlias?: string;
}

export interface FilterItemView {
  slug: string;
  /** Значение группы (для localizedName); у бренда его нет. */
  value?: FilterGroupValue;
  /** Подпись бренда. */
  brandLabel?: string;
  count?: number;
  selected: boolean;
  /** Zero-count value that is not selected: shown muted and not clickable. */
  disabled: boolean;
}

export interface FilterSectionView {
  key: string;
  isBrand: boolean;
  group?: FilterGroup;
  open: boolean;
  selectedCount: number;
  items: FilterItemView[];
  /** Сколько значений скрыто за «Ещё N» (0 — кнопки «Ещё» нет). */
  hiddenCount: number;
  /** Список раскрыт целиком и длиннее лимита — показываем «Свернуть». */
  canCollapse: boolean;
}

/**
 * Стабильная сортировка ключей разделов: известные — по SECTION_ORDER,
 * остальные уходят в конец в исходном порядке.
 */
export function sortSectionKeys(keys: readonly string[]): string[] {
  const rank = (key: string) => {
    const i = SECTION_ORDER.indexOf(key);
    return i === -1 ? SECTION_ORDER.length : i;
  };
  return keys
    .map((key, index) => ({key, index}))
    .sort((a, b) => rank(a.key) - rank(b.key) || a.index - b.index)
    .map(x => x.key);
}

/** Раздел с единственным значением бесполезен, пока оно не выбрано (иначе его нечем снять). */
export function isSectionVisible(valuesCount: number, selectedCount: number): boolean {
  return valuesCount > 1 || selectedCount > 0;
}

/** Раскрыты по умолчанию: первые `limit` видимых разделов и все, где есть выбор. */
export function defaultOpenKeys(
  visibleKeys: readonly string[],
  selectedCountByKey: ReadonlyMap<string, number>,
  limit: number = DEFAULT_OPEN_SECTIONS,
): Set<string> {
  const open = new Set(visibleKeys.slice(0, limit));
  visibleKeys.forEach(key => {
    if ((selectedCountByKey.get(key) ?? 0) > 0) open.add(key);
  });
  return open;
}

/**
 * Какие значения показать. Свёрнуто: первые `limit` + выбранные из хвоста
 * (подтягиваются на место в исходном порядке — выбранное не прячется).
 * Раскрыто: все.
 */
export function pickVisibleValues<T extends {slug: string}>(
  values: readonly T[],
  isSelected: (slug: string) => boolean,
  expanded: boolean,
  limit: number = VISIBLE_VALUES_LIMIT,
): {shown: T[]; hiddenCount: number} {
  if (expanded || values.length <= limit) return {shown: [...values], hiddenCount: 0};
  const shown = values.filter((v, i) => i < limit || isSelected(v.slug));
  return {shown, hiddenCount: values.length - shown.length};
}

export interface BuildSectionsInput {
  brands: readonly BrandOption[];
  groups: readonly FilterGroup[];
  /** Применённый выбор — от него зависят видимость, дефолтное раскрытие и подтягивание хвоста. */
  appliedBrand: string | null;
  appliedFilters: ReadonlyMap<string, ReadonlySet<string>>;
  /** Выбор для отметок и счётчика в заголовке (в панели — pending). */
  markBrand: string | null;
  markFilters: ReadonlyMap<string, ReadonlySet<string>>;
  /** Клики пользователя поверх дефолта: true/false. */
  openOverrides: ReadonlyMap<string, boolean>;
  /** Разделы, где нажато «Ещё N» (показаны все значения). */
  expandedKeys: ReadonlySet<string>;
}

/** Собирает упорядоченные видимые разделы с готовым состоянием для шаблона. */
export function buildFilterSections(input: BuildSectionsInput): FilterSectionView[] {
  const {brands, groups, appliedBrand, appliedFilters, markBrand, markFilters, openOverrides, expandedKeys} = input;

  const appliedCount = (key: string) =>
    key === BRAND_SECTION_KEY ? (appliedBrand ? 1 : 0) : (appliedFilters.get(key)?.size ?? 0);
  const markCount = (key: string) =>
    key === BRAND_SECTION_KEY ? (markBrand ? 1 : 0) : (markFilters.get(key)?.size ?? 0);

  const groupBySlug = new Map(groups.map(g => [g.slug, g]));
  const totalOf = (key: string) =>
    key === BRAND_SECTION_KEY ? brands.length : (groupBySlug.get(key)?.values.length ?? 0);

  const visibleKeys = sortSectionKeys([BRAND_SECTION_KEY, ...groupBySlug.keys()])
    .filter(key => isSectionVisible(totalOf(key), appliedCount(key)));
  const defaults = defaultOpenKeys(visibleKeys, new Map(visibleKeys.map(k => [k, appliedCount(k)])));

  return visibleKeys.map(key => {
    const isBrand = key === BRAND_SECTION_KEY;
    const group = isBrand ? undefined : groupBySlug.get(key);
    const expanded = expandedKeys.has(key);

    const all: FilterItemView[] = isBrand
      ? brands.map(b => ({slug: b.brand, brandLabel: b.brandAlias || b.brand, selected: markBrand === b.brand, disabled: false}))
      : group!.values.map(v => ({
        slug: v.slug,
        value: v,
        count: v.count,
        selected: markFilters.get(key)?.has(v.slug) ?? false,
        // A selected (or still applied) value stays clickable even at zero, so it can be unselected
        disabled: v.count === 0
          && !(markFilters.get(key)?.has(v.slug) ?? false)
          && !(appliedFilters.get(key)?.has(v.slug) ?? false),
      }));

    const appliedSelected = (slug: string) =>
      isBrand ? appliedBrand === slug : (appliedFilters.get(key)?.has(slug) ?? false);
    const {shown, hiddenCount} = pickVisibleValues(all, appliedSelected, expanded);

    return {
      key,
      isBrand,
      group,
      open: openOverrides.get(key) ?? defaults.has(key),
      selectedCount: markCount(key),
      items: shown,
      hiddenCount,
      canCollapse: expanded && all.length > VISIBLE_VALUES_LIMIT,
    };
  });
}
