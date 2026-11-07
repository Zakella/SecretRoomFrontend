import {TestBed} from '@angular/core/testing';
import {firstValueFrom} from 'rxjs';
import {provideTransloco, TranslocoService} from '@ngneat/transloco';
import {TranslocateHttpLoader} from '../../@core/configs/transloco-config';
import {PromotionBadge} from '../../entities/promotion';
import {promoLabel, PromoLabelPipe} from './promo-label.pipe';

const badge = (overrides: Partial<PromotionBadge>): PromotionBadge =>
  ({id: 7, type: 'PERCENT', percent: null, nth: null, buy: null, free: null, onlineOnly: false, ...overrides});

describe('promoLabel (SR-229)', () => {
  let transloco: TranslocoService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideTransloco({
        config: {availableLangs: ['ro', 'ru'], defaultLang: 'ro', prodMode: true},
        loader: TranslocateHttpLoader,
      })],
    });
    transloco = TestBed.inject(TranslocoService);
  });

  async function text(promotion: PromotionBadge, lang: 'ro' | 'ru'): Promise<string> {
    const label = promoLabel(promotion)!;
    return firstValueFrom(transloco.selectTranslate(label.key, label.params, lang));
  }

  it('PERCENT: «−p%» in both languages', async () => {
    const p = badge({type: 'PERCENT', percent: 20});
    expect(await text(p, 'ru')).toBe('−20%');
    expect(await text(p, 'ro')).toBe('−20%');
  });

  it('NTH_PERCENT: «2-й товар −50%» / «Al 2-lea produs −50%»', async () => {
    const p = badge({type: 'NTH_PERCENT', percent: 50, nth: 2});
    expect(await text(p, 'ru')).toBe('2-й товар −50%');
    expect(await text(p, 'ro')).toBe('Al 2-lea produs −50%');
  });

  it('BUY_X_GET_Y: «2+1 в подарок» / «2+1 cadou»', async () => {
    const p = badge({type: 'BUY_X_GET_Y', buy: 2, free: 1});
    expect(await text(p, 'ru')).toBe('2+1 в подарок');
    expect(await text(p, 'ro')).toBe('2+1 cadou');
  });

  it('«only online» and the discount row exist in both languages', async () => {
    expect(await firstValueFrom(transloco.selectTranslate('promo.onlineOnly', {}, 'ru'))).toBe('только онлайн');
    expect(await firstValueFrom(transloco.selectTranslate('promo.onlineOnly', {}, 'ro'))).toBe('doar online');
    expect(await firstValueFrom(transloco.selectTranslate('promo.discount', {}, 'ru'))).toBe('Скидка по акции');
    expect(await firstValueFrom(transloco.selectTranslate('promo.discount', {}, 'ro'))).toBe('Reducere promoțională');
  });

  it('nothing to show: no promotion, unknown type, incomplete parameters', () => {
    expect(promoLabel(null)).toBeNull();
    expect(promoLabel(undefined)).toBeNull();
    expect(promoLabel(badge({type: 'GIFT', percent: 10}))).toBeNull();
    expect(promoLabel(badge({type: 'PERCENT', percent: 0}))).toBeNull();
    expect(promoLabel(badge({type: 'NTH_PERCENT', percent: 50, nth: null}))).toBeNull();
    expect(promoLabel(badge({type: 'BUY_X_GET_Y', buy: 2, free: null}))).toBeNull();
  });

  it('the pipe returns the same key and params', () => {
    expect(new PromoLabelPipe().transform(badge({type: 'NTH_PERCENT', percent: 30, nth: 3})))
      .toEqual({key: 'promo.nthPercent', params: {nth: 3, percent: 30}});
  });
});
