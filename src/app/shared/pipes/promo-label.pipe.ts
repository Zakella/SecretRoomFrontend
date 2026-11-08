import {Pipe, PipeTransform} from '@angular/core';
import {PromotionBadge} from '../../entities/promotion';

/** Translation key and params of a promotion label; null — unknown type, nothing to show. */
export interface PromoLabel {
  key: string;
  params: Record<string, number>;
}

/** Label of a promotion by type (dictionaries ro/ru, group `promo`); the admin name is never shown. */
export function promoLabel(promotion: PromotionBadge | null | undefined): PromoLabel | null {
  if (!promotion) return null;
  const percent = promotion.percent ?? 0;
  switch (promotion.type) {
    case 'PERCENT':
      return percent > 0 ? {key: 'promo.percent', params: {percent}} : null;
    case 'NTH_PERCENT':
      return percent > 0 && promotion.nth ? {key: 'promo.nthPercent', params: {nth: promotion.nth, percent}} : null;
    case 'BUY_X_GET_Y':
      return promotion.buy && promotion.free
        ? {key: 'promo.buyXGetY', params: {buy: promotion.buy, free: promotion.free}}
        : null;
    default:
      return null;
  }
}

/** `@if (p | promoLabel; as label) { {{ label.key | transloco: label.params }} }` — language follows transloco. */
@Pipe({name: 'promoLabel'})
export class PromoLabelPipe implements PipeTransform {
  transform(promotion: PromotionBadge | null | undefined): PromoLabel | null {
    return promoLabel(promotion);
  }
}
