import {Slugify} from './slugify';

describe('Slugify', () => {
  let slugify: Slugify;

  beforeEach(() => {
    slugify = new Slugify();
  });

  describe('transform', () => {
    it('should return empty string for falsy input', () => {
      expect(slugify.transform('')).toBe('');
      expect(slugify.transform(null as unknown as string)).toBe('');
    });

    it('should lowercase and replace spaces with hyphens', () => {
      expect(slugify.transform('Hello World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify.transform('Hello, World!')).toBe('hello-world');
    });

    it('should collapse multiple hyphens', () => {
      expect(slugify.transform('Hello   World')).toBe('hello-world');
    });

    it('should trim hyphens from start and end', () => {
      expect(slugify.transform(' Hello World ')).toBe('hello-world');
    });

    it('should transliterate Romanian characters', () => {
      expect(slugify.transform('Șosete și țesături')).toBe('sosete-si-tesaturi');
    });

    it('should transliterate Russian characters', () => {
      expect(slugify.transform('Привет мир')).toBe('privet-mir');
    });

    it('should handle mixed content', () => {
      expect(slugify.transform('Victoria\'s Secret Бельё')).toBe('victorias-secret-belyo');
    });
  });

  describe('categorySlug', () => {
    const cat = {name: 'Underwear', nameRo: 'Lenjerie', nameRu: 'Бельё'};

    it('should return Romanian slug for "ro" lang', () => {
      expect(slugify.categorySlug(cat, 'ro')).toBe('lenjerie');
    });

    it('should return Russian-transliterated slug for "ru" lang', () => {
      expect(slugify.categorySlug(cat, 'ru')).toBe('belyo');
    });

    it('should fallback to name if localized name is empty', () => {
      const noRo = {name: 'Underwear', nameRo: '', nameRu: 'Бельё'};
      expect(slugify.categorySlug(noRo, 'ro')).toBe('underwear');
    });
  });

  describe('productUrl', () => {
    it('should return url segments array', () => {
      expect(slugify.productUrl('ro', '42', 'Cool Product')).toEqual([
        '/', 'ro', 'product', '42', 'cool-product',
      ]);
    });
  });
});
