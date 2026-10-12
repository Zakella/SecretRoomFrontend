import {ChangeDetectionStrategy, Component, computed, inject, input} from '@angular/core';
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

interface SwatchView {
  sibling: ProductSibling;
  link: string[];
  label: string;
}

@Component({
  selector: 'product-swatches',
  imports: [RouterLink, TranslocoPipe, NgTemplateOutlet],
  templateUrl: './product-swatches.html',
  styleUrl: './product-swatches.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductSwatches {
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

  protected items = computed<SwatchView[]>(() => {
    const lang = this.activeLang();
    return (this.siblings() ?? []).map(sibling => ({
      sibling,
      link: this.slugify.productUrl(lang, String(sibling.appId), sibling.name),
      label: (lang === 'ro' ? sibling.optionLabelRo : sibling.optionLabelRu)
        || sibling.optionLabelRu || sibling.optionLabelRo || sibling.name
    }));
  });
}
