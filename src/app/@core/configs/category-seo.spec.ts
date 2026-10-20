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
    const ids = Object.keys(CATEGORY_SEO).map(Number);
    const langs = ['ro', 'ru'] as const;

    it('should cover categories 1..18', () => {
      for (let id = 1; id <= 18; id++) {
        expect(CATEGORY_SEO[id]).withContext(`category ${id}`).toBeDefined();
      }
    });

    it('should fill h1, title, description and keywords in both locales', () => {
      for (const id of ids) {
        for (const lang of langs) {
          const locale = CATEGORY_SEO[id][lang];
          expect(locale.h1.trim().length).withContext(`${id}.${lang}.h1`).toBeGreaterThan(0);
          expect(locale.title.length).withContext(`${id}.${lang}.title`).toBeGreaterThan(0);
          expect(locale.description.length).withContext(`${id}.${lang}.description`).toBeGreaterThan(0);
          expect(locale.keywords.length).withContext(`${id}.${lang}.keywords`).toBeGreaterThan(0);
        }
      }
    });

    it('should keep title <= 65 chars with the brand suffix and description <= 155 chars', () => {
      for (const id of ids) {
        for (const lang of langs) {
          const locale = CATEGORY_SEO[id][lang];
          expect(locale.title.length).withContext(`${id}.${lang}.title`).toBeLessThanOrEqual(65);
          expect(locale.title.endsWith(' | Secret Room')).withContext(`${id}.${lang}.title suffix`).toBeTrue();
          expect(locale.description.length).withContext(`${id}.${lang}.description`).toBeLessThanOrEqual(155);
        }
      }
    });

    it('should not mention Bath & Body Works in lingerie, swimwear and pajamas categories', () => {
      for (const id of [2, 3, 5, 8]) {
        for (const lang of langs) {
          const {title, description} = CATEGORY_SEO[id][lang];
          for (const text of [title, description]) {
            expect(text).withContext(`${id}.${lang}`).not.toContain('Bath & Body Works');
            expect(text).withContext(`${id}.${lang}`).not.toContain('BBW');
          }
        }
      }
    });

    it('should keep Romanian diacritics (no ASCII "dama"/"si")', () => {
      expect(CATEGORY_SEO[2].ro.h1).toBe('Sutiene damă');
      expect(CATEGORY_SEO[9].ro.h1).toBe('Spray de corp și body mist');
      for (const id of ids) {
        const {h1, title, description} = CATEGORY_SEO[id].ro;
        for (const text of [h1, title, description]) {
          expect(/\b(dama|si)\b/.test(text)).withContext(`${id}.ro: ${text}`).toBeFalse();
        }
      }
    });

    it('should start titles of the quick-win categories with the target query', () => {
      expect(CATEGORY_SEO[9].ro.title.startsWith('Spray de corp și body mist')).toBeTrue();
      expect(CATEGORY_SEO[9].ru.title.startsWith('Спреи и мисты для тела')).toBeTrue();
      expect(CATEGORY_SEO[7].ro.title.startsWith('Parfum Victoria')).toBeTrue();
      expect(CATEGORY_SEO[7].ru.title.startsWith('Духи Victoria')).toBeTrue();
    });
  });
});
