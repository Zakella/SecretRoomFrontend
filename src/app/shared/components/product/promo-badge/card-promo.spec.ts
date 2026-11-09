import {Product} from '../../../../entities/product';
import {cardPromo} from './card-promo';

const percent = {id: 1, type: 'PERCENT', percent: 20, nth: null, buy: null, free: null, onlineOnly: false};

function product(overrides: Partial<Product> = {}): Product {
  return {id: '1', name: 'P', unitsInStock: 5, ...overrides} as Product;
}

describe('cardPromo', () => {
  it('should be null without a product', () => {
    expect(cardPromo(null)).toBeNull();
    expect(cardPromo(undefined)).toBeNull();
  });

  it('should be null without promotions (missing or empty)', () => {
    expect(cardPromo(product())).toBeNull();
    expect(cardPromo(product({promotions: []}))).toBeNull();
  });

  it('should label PERCENT, NTH_PERCENT and BUY_X_GET_Y', () => {
    expect(cardPromo(product({promotions: [percent]}))).toEqual({
      label: {key: 'promo.percent', params: {percent: 20}}, onlineOnly: false,
    });
    expect(cardPromo(product({promotions: [{...percent, type: 'NTH_PERCENT', percent: 50, nth: 2}]}))!.label)
      .toEqual({key: 'promo.nthPercent', params: {nth: 2, percent: 50}});
    expect(cardPromo(product({promotions: [{...percent, type: 'BUY_X_GET_Y', percent: null, buy: 2, free: 1}]}))!.label)
      .toEqual({key: 'promo.buyXGetY', params: {buy: 2, free: 1}});
  });

  it('should take the first promotion only', () => {
    const result = cardPromo(product({promotions: [{...percent, percent: 30}, {...percent, id: 2, type: 'BUY_X_GET_Y', buy: 2, free: 1}]}));
    expect(result!.label).toEqual({key: 'promo.percent', params: {percent: 30}});
  });

  it('should be null when the first promotion has no label (zero percent, unknown type)', () => {
    expect(cardPromo(product({promotions: [{...percent, percent: 0}]}))).toBeNull();
    expect(cardPromo(product({promotions: [{...percent, type: 'UNKNOWN'}]}))).toBeNull();
  });

  it('should carry onlineOnly of the first promotion', () => {
    expect(cardPromo(product({promotions: [{...percent, onlineOnly: true}]}))!.onlineOnly).toBeTrue();
    expect(cardPromo(product({promotions: [{...percent, onlineOnly: undefined}]}))!.onlineOnly).toBeFalse();
  });

  describe('stock', () => {
    it('should be null for a product without variants and without stock', () => {
      expect(cardPromo(product({unitsInStock: 0, promotions: [percent]}))).toBeNull();
      expect(cardPromo(product({unitsInStock: undefined, promotions: [percent]}))).toBeNull();
    });

    it('should be null when no variant is available with stock', () => {
      const variants = [
        {available: true, unitsInStock: 0},
        {available: false, unitsInStock: 4},
      ] as Product['variants'];
      expect(cardPromo(product({unitsInStock: 9, variants, promotions: [percent]}))).toBeNull();
    });

    it('should be shown when at least one variant is available with stock', () => {
      const variants = [
        {available: false, unitsInStock: 4},
        {available: true, unitsInStock: 2},
      ] as Product['variants'];
      expect(cardPromo(product({unitsInStock: 0, variants, promotions: [percent]}))).not.toBeNull();
    });
  });
});
