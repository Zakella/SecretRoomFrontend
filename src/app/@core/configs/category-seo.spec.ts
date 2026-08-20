import {CATEGORY_SEO, getCategorySeo} from './category-seo';

describe('category-seo', () => {
  describe('getCategorySeo', () => {
    it('should return null when the category id is missing', () => {
      expect(getCategorySeo(null, 'ro')).toBeNull();
      expect(getCategorySeo(undefined, 'ro')).toBeNull();
    });

    it('should return null for a category that is not in the dictionary', () => {
      expect(getCategorySeo(999, 'ro')).toBeNull();
    });

    it('should return the Romanian copy for "ro"', () => {
      expect(getCategorySeo(1, 'ro')).toBe(CATEGORY_SEO[1].ro);
    });

    it('should return the Russian copy for "ru"', () => {
      expect(getCategorySeo(1, 'ru')).toBe(CATEGORY_SEO[1].ru);
    });

    it('should fall back to Romanian for an unknown language', () => {
      expect(getCategorySeo(1, 'en')).toBe(CATEGORY_SEO[1].ro);
    });

    it('should carry hand-written copy, not the generic catalog template', () => {
      const ro = getCategorySeo(1, 'ro')!;
      expect(ro.title).not.toContain('Victoria');
      expect(ro.title).not.toBe(getCategorySeo(1, 'ru')!.title);
    });
  });

  describe('CATEGORY_SEO dictionary', () => {
    it('should fill title, description and keywords in both locales', () => {
      for (const id of Object.keys(CATEGORY_SEO).map(Number)) {
        for (const lang of ['ro', 'ru'] as const) {
          const locale = CATEGORY_SEO[id][lang];
          expect(locale.title.length).withContext(`${id}.${lang}.title`).toBeGreaterThan(0);
          expect(locale.description.length).withContext(`${id}.${lang}.description`).toBeGreaterThan(0);
          expect(locale.keywords.length).withContext(`${id}.${lang}.keywords`).toBeGreaterThan(0);
          expect(locale.description.length).withContext(`${id}.${lang}.description`).toBeLessThanOrEqual(160);
        }
      }
    });
  });
});
