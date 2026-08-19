/**
 * Ручные title/description по отдельным категориям каталога.
 *
 * Общий шаблон («{Категория} Victoria's Secret și Bath & Body Works — Moldova»)
 * даёт длинный заголовок-перечисление и описание ни о чём. Для страниц, где по Search Console
 * видно сломанный сниппет (высокая позиция при нулевом CTR), заголовок и описание пишутся руками.
 *
 * Ключ — id категории из API (не слаг: слаги отличаются по языкам).
 * Категории нет в словаре — работает generic-шаблон в Catalog.updateMeta().
 */

export interface CategorySeoLocale {
  title: string;
  description: string;
  keywords: string;
}

export interface CategorySeo {
  ro: CategorySeoLocale;
  ru: CategorySeoLocale;
}

export const CATEGORY_SEO: Record<number, CategorySeo> = {
  // id 1 — «Cosmetică și îngrijire» / «Косметика и уход».
  // GSC: /ro/catalog/cosmetica-si-ingrijire — позиция 3.24, 263 показа, 0 кликов.
  1: {
    ro: {
      title: 'Cosmetică și îngrijirea corpului — Loțiuni, Spray-uri, Creme | Secret Room',
      description: 'Loțiuni de corp, spray-uri parfumate, creme, unt de corp, geluri de duș și scrub-uri Victoria\'s Secret și Bath & Body Works. Livrare în toată Moldova.',
      keywords: 'cosmetica moldova, ingrijirea corpului, lotiune de corp chisinau, spray de corp, gel de dus, unt de corp, косметика молдова, лосьон для тела кишинев'
    },
    ru: {
      title: 'Косметика и уход за телом — лосьоны, спреи, кремы | Secret Room',
      description: 'Лосьоны для тела, парфюмированные спреи, кремы, баттеры, гели для душа и скрабы Victoria\'s Secret и Bath & Body Works. Доставка по всей Молдове.',
      keywords: 'косметика молдова, уход за телом, лосьон для тела кишинев, спрей для тела, гель для душа, баттер для тела, cosmetica moldova'
    }
  }
};

export function getCategorySeo(categoryId: number | null | undefined, lang: string): CategorySeoLocale | null {
  if (categoryId === null || categoryId === undefined) return null;
  const entry = CATEGORY_SEO[categoryId];
  if (!entry) return null;
  return lang === 'ru' ? entry.ru : entry.ro;
}
