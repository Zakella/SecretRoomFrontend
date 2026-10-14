import {ChangeDetectionStrategy, Component, computed, effect, inject, input, signal} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {RouterLink} from '@angular/router';
import {TranslocoPipe} from '@ngneat/transloco';
import {Language} from '../../../../@core/services/language';
import {Slugify} from '../../../../@core/services/slugify';
import {ProductSibling} from '../../../../entities/product-sibling';

/** Минимальное число карточек модели (включая текущую), при котором блок показывается. */
export const MIN_SWATCHES = 2;

/** Ключ i18n подписи типа опции (Цвет/Аромат/Оттенок/Вариант). Переиспользуется в SR-93 для «+N цветов». */
export function optionTypeLabelKey(optionType: string | null | undefined): string {
  switch (optionType) {
    case 'COLOR': return 'OptionTypeColor';
    case 'SCENT': return 'OptionTypeScent';
    case 'SHADE': return 'OptionTypeShade';
    default: return 'OptionTypeVariant';
  }
}

/** Сколько вариантов видно в свёрнутом виде: десктоп (2 ряда по 5) и мобильный (<768). */
export const DESKTOP_LIMIT = 10;
export const MOBILE_LIMIT = 8;
/** Если вариантов не больше лимит + SLACK — кнопка не нужна (не прячем 1–2 плитки). */
export const SWATCHES_SLACK = 2;

/** В наличии — первыми, распроданные в конец; порядок внутри групп сохраняется (sort стабилен). */
export function sortInStockFirst<T extends {inStock: boolean}>(list: readonly T[]): T[] {
  return [...list].sort((a, b) => Number(b.inStock) - Number(a.inStock));
}

/** Нужна ли кнопка «Ещё» при данном лимите. */
export function needsToggle(total: number, limit: number): boolean {
  return total > limit + SWATCHES_SLACK;
}

interface SwatchView {
  sibling: ProductSibling;
  link: string[];
  label: string;
  /** За лимитом десктопа / мобильного: прячет CSS (в DOM остаётся для SEO). Текущий вариант не скрывается никогда. */
  hideDesktop: boolean;
  hideMobile: boolean;
}

@Component({
  selector: 'product-swatches',
  imports: [RouterLink, TranslocoPipe, NgTemplateOutlet],
  templateUrl: './product-swatches.html',
  styleUrl: './product-swatches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSwatches {
  private static nextId = 0;
  /** Уникальный id подписи типа: на странице может быть несколько блоков (aria-labelledby списка). */
  protected readonly labelId = `swatches-label-${ProductSwatches.nextId++}`;
  private slugify = inject(Slugify);
  private activeLang = inject(Language).currentLanguage;

  readonly siblings = input<ProductSibling[] | null | undefined>();
  readonly optionType = input<string | null | undefined>();
  /** Выбранный размер текущей карточки: уходит в ?size= ссылки соседа. */
  readonly selectedSize = input<string | null | undefined>();

  protected visible = computed(() => (this.siblings()?.length ?? 0) >= MIN_SWATCHES);
  protected typeKey = computed(() => optionTypeLabelKey(this.optionType()));
  protected queryParams = computed(() => {
    const size = this.selectedSize();
    return size ? {size} : null;
  });

  protected expanded = signal(false);
  /** Роутер может переиспользовать компонент при переходе на другой товар: сворачиваем заново. */
  private resetOnSiblingsChange = effect(() => {
    this.siblings();
    this.expanded.set(false);
  });
  private total = computed(() => this.siblings()?.length ?? 0);
  protected toggleDesktop = computed(() => needsToggle(this.total(), DESKTOP_LIMIT));
  protected toggleMobile = computed(() => needsToggle(this.total(), MOBILE_LIMIT));
  protected hiddenDesktop = computed(() => this.items().filter(i => i.hideDesktop).length);
  protected hiddenMobile = computed(() => this.items().filter(i => i.hideMobile).length);

  protected toggle(): void {
    this.expanded.update(v => !v);
  }

  protected items = computed<SwatchView[]>(() => {
    const lang = this.activeLang();
    const collapsed = !this.expanded();
    const hideD = collapsed && this.toggleDesktop();
    const hideM = collapsed && this.toggleMobile();
    return sortInStockFirst(this.siblings() ?? []).map((sibling, index) => ({
      sibling,
      hideDesktop: hideD && index >= DESKTOP_LIMIT && !sibling.current,
      hideMobile: hideM && index >= MOBILE_LIMIT && !sibling.current,
      link: this.slugify.productUrl(lang, String(sibling.appId), sibling.name),
      label: (lang === 'ro' ? sibling.optionLabelRo : sibling.optionLabelRu)
        || sibling.optionLabelRu || sibling.optionLabelRo || sibling.name
    }));
  });
}
