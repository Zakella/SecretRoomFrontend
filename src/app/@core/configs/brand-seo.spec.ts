import {BRAND_SEO, getBrandSeo} from './brand-seo';

describe('brand-seo', () => {
  const slugs = Object.keys(BRAND_SEO);

  describe('getBrandSeo', () => {
    it('should return null for a missing slug', () => {
      expect(getBrandSeo(null, 'ro')).toBeNull();
      expect(getBrandSeo('', 'ro')).toBeNull();
    });

    it('should return null for a brand that is not in the dictionary', () => {
      expect(getBrandSeo('nayomi', 'ro')).toBeNull();
      expect(getBrandSeo('adore-me', 'ru')).toBeNull();
    });

    it('should return the Romanian copy for "ro"', () => {
      expect(getBrandSeo('victorias-secret', 'ro')).toBe(BRAND_SEO['victorias-secret'].ro);
    });

    it('should return the Russian copy for "ru"', () => {
      expect(getBrandSeo('victorias-secret', 'ru')).toBe(BRAND_SEO['victorias-secret'].ru);
    });

    it('should fall back to Romanian for an unknown language', () => {
      expect(getBrandSeo('ann-summers', 'en')).toBe(BRAND_SEO['ann-summers'].ro);
    });

    it('should not match a slug with different casing', () => {
      // ключ словаря — результат BrandService.toSlug(), он всегда в нижнем регистре
      expect(getBrandSeo('Victorias-Secret', 'ro')).toBeNull();
    });

    it('should carry brand-specific copy, not one shared template', () => {
      const ann = getBrandSeo('ann-summers', 'ro')!;
      const vs = getBrandSeo('victorias-secret', 'ro')!;
      expect(ann.title).not.toBe(vs.title);
      expect(ann.description).not.toBe(vs.description);
    });
  });

  describe('BRAND_SEO dictionary', () => {
    it('should key every entry by a lowercase kebab slug', () => {
      for (const slug of slugs) {
        expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      }
    });

    it('should fill every field in both locales', () => {
      for (const slug of slugs) {
        for (const lang of ['ro', 'ru'] as const) {
          const locale = BRAND_SEO[slug][lang];
          expect(locale.title.length).withContext(`${slug}.${lang}.title`).toBeGreaterThan(0);
          expect(locale.description.length).withContext(`${slug}.${lang}.description`).toBeGreaterThan(0);
          expect(locale.keywords.length).withContext(`${slug}.${lang}.keywords`).toBeGreaterThan(0);
          expect(locale.heading.length).withContext(`${slug}.${lang}.heading`).toBeGreaterThan(0);
          expect(locale.paragraphs.length).withContext(`${slug}.${lang}.paragraphs`).toBeGreaterThan(0);
        }
      }
    });

    it('should keep descriptions inside the ~160 char snippet limit', () => {
      for (const slug of slugs) {
        for (const lang of ['ro', 'ru'] as const) {
          expect(BRAND_SEO[slug][lang].description.length)
            .withContext(`${slug}.${lang}.description`)
            .toBeLessThanOrEqual(160);
        }
      }
    });

    it('should not reuse a title between brands or locales', () => {
      const titles = slugs.flatMap(s => [BRAND_SEO[s].ro.title, BRAND_SEO[s].ru.title]);
      expect(new Set(titles).size).toBe(titles.length);
    });
  });
});
