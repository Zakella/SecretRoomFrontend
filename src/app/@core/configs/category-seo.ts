/**
 * Ручные h1/title/description по категориям каталога.
 *
 * Словарь покрывает все категории из sitemap (id 1–18). Общий шаблон
 * («{Категория} Victoria's Secret și Bath & Body Works — Moldova») остался запасным путём
 * в Catalog.updateMeta() для новых категорий, которых ещё нет в словаре: он даёт длинный
 * заголовок-перечисление и описание ни о чём, поэтому новую категорию стоит добавлять сюда руками.
 *
 * Ключ — id категории из API (не слаг: слаги отличаются по языкам).
 * h1 — видимый заголовок страницы, title/description — для <title> и meta description.
 */

export interface CategorySeoLocale {
  /** Видимый заголовок страницы (H1). */
  h1: string;
  title: string;
  description: string;
  keywords: string;
}

export interface CategorySeo {
  ro: CategorySeoLocale;
  ru: CategorySeoLocale;
}

export const CATEGORY_SEO: Record<number, CategorySeo> = {
  // id 1 — «Cosmetică și îngrijire» / «Косметика и уход». GSC: позиция 3.24, 263 показа, 0 кликов. Бренды: BBW, VS, PINK, Kiko Milano, Charlotte Tilbury
  1: {
    ro: {
      h1: 'Cosmetică și îngrijirea corpului',
      title: 'Cosmetică și îngrijire corp: loțiuni, spray-uri | Secret Room',
      description: 'Loțiuni, spray-uri de corp, creme, geluri de duș și scrub-uri Victoria\'s Secret și Bath & Body Works, originale din SUA. 3 magazine în Chișinău.',
      keywords: 'cosmetica moldova, ingrijirea corpului, lotiune de corp chisinau, spray de corp, gel de dus, unt de corp, косметика молдова, лосьон для тела кишинев'
    },
    ru: {
      h1: 'Косметика и уход за телом',
      title: 'Косметика и уход за телом: лосьоны, спреи | Secret Room',
      description: 'Лосьоны, спреи для тела, кремы, гели для душа и скрабы Victoria\'s Secret и Bath & Body Works — оригинал из США. 3 магазина в Кишинёве.',
      keywords: 'косметика молдова, уход за телом, лосьон для тела кишинев, спрей для тела, гель для душа, баттер для тела, cosmetica moldova'
    }
  },
  // id 2 — «Sutiene» / «Бюстгальтеры». Бренды: VS, PINK, Ann Summers, Nayomi — BBW нет. bralette в выдаче 0 товаров (20.10) — в текст не берём
  2: {
    ro: {
      h1: 'Sutiene damă',
      title: 'Sutiene damă: push-up, fără bretele | Secret Room',
      description: 'Sutiene Victoria\'s Secret, PINK, Ann Summers și Nayomi: push-up, fără bretele, balconet. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'sutiene chisinau, sutiene victoria secret, sutiene push-up, sutien fara bretele, sutiene moldova, бюстгальтеры кишинев'
    },
    ru: {
      h1: 'Женские бюстгальтеры',
      title: 'Бюстгальтеры: пуш-ап, без бретелей | Secret Room',
      description: 'Бюстгальтеры Victoria\'s Secret, PINK, Ann Summers и Nayomi: пуш-ап, без бретелей, балконет. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'бюстгальтеры кишинев, бюстгальтер victoria secret, бюстгальтер пуш-ап, бюстгальтер без бретелей, бюстгальтеры молдова, sutiene chisinau'
    }
  },
  // id 3 — «Chiloți» / «Трусы». Бренды: VS, PINK, Ann Summers, Nayomi — BBW нет
  3: {
    ro: {
      h1: 'Chiloți damă',
      title: 'Chiloți damă: tanga, brazilieni, cheeky | Secret Room',
      description: 'Chiloți Victoria\'s Secret, PINK, Ann Summers și Nayomi: tanga, brazilieni, cheeky, bikini. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'chiloti dama, chiloti victoria secret, chiloti tanga, chiloti chisinau, chiloti moldova, трусы кишинев'
    },
    ru: {
      h1: 'Женские трусы',
      title: 'Женские трусы: стринги, бразилиана, чики | Secret Room',
      description: 'Трусы Victoria\'s Secret, PINK, Ann Summers и Nayomi: стринги, бразилиана, чики, бикини. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'женские трусы кишинев, трусы victoria secret, трусы стринги, трусы бразилиана, трусы молдова, chiloti chisinau'
    }
  },
  // id 4 — «Seturi cadou» / «Подарочные наборы». Бренды: только VS
  4: {
    ro: {
      h1: 'Seturi cadou pentru femei',
      title: 'Seturi cadou pentru femei Victoria\'s Secret | Secret Room',
      description: 'Seturi cadou Victoria\'s Secret: parfum și spray de corp, mini spray-uri, loțiuni, glosuri. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'seturi cadou femei, set cadou victoria secret, cadou pentru ea chisinau, set parfum si spray, seturi cadou moldova, подарочные наборы'
    },
    ru: {
      h1: 'Подарочные наборы для женщин',
      title: 'Подарочные наборы Victoria\'s Secret для женщин | Secret Room',
      description: 'Подарочные наборы Victoria\'s Secret: духи и спреи для тела, мини-спреи, лосьоны, блески. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'подарочные наборы для женщин, набор victoria secret, подарок для неё кишинев, набор духи и спрей, подарочные наборы молдова, seturi cadou'
    }
  },
  // id 5 — «Pijamale» / «Пижамы». Бренды: VS, Nayomi — BBW нет. Большинство моделей — сатин
  5: {
    ro: {
      h1: 'Pijamale damă',
      title: 'Pijamale damă din satin Victoria\'s Secret | Secret Room',
      description: 'Pijamale damă Victoria\'s Secret și Nayomi: seturi din satin, modal și flanel. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'pijamale dama, pijamale satin, pijama victoria secret, pijamale chisinau, pijamale moldova, пижамы кишинев'
    },
    ru: {
      h1: 'Женские пижамы',
      title: 'Женские пижамы из сатина Victoria\'s Secret | Secret Room',
      description: 'Женские пижамы Victoria\'s Secret и Nayomi: комплекты из сатина, модала и фланели. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'женские пижамы, пижама сатин, пижама victoria secret, пижамы кишинев, пижамы молдова, pijamale dama'
    }
  },
  // id 6 — «Accesorii» / «Аксессуары» (в API опечатка «Акссесуары» — H1 берём отсюда). Бренды: VS, Nayomi, Kiko Milano
  6: {
    ro: {
      h1: 'Accesorii',
      title: 'Accesorii Victoria\'s Secret: genți, papuci, halate | Secret Room',
      description: 'Accesorii Victoria\'s Secret și Nayomi: genți, portofele, papuci, halate, umbrele. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'accesorii victoria secret, genti victoria secret, papuci dama, halat dama, accesorii chisinau, аксессуары кишинев'
    },
    ru: {
      h1: 'Аксессуары',
      title: 'Аксессуары Victoria\'s Secret: сумки, тапочки | Secret Room',
      description: 'Аксессуары Victoria\'s Secret и Nayomi: сумки, кошельки, тапочки, халаты, зонты. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'аксессуары victoria secret, сумки victoria secret, тапочки женские, халат женский, аксессуары кишинев, accesorii victoria secret'
    }
  },
  // id 7 — «Parfumuri» / «Парфюмы». Бренды: VS, BBW. Запрос «виктория сикрет духи»
  7: {
    ro: {
      h1: 'Parfumuri Victoria\'s Secret',
      title: 'Parfum Victoria\'s Secret: Bombshell, Tease | Secret Room',
      description: 'Parfumuri Victoria\'s Secret Bombshell, Tease, Very Sexy și Bare, mini parfumuri și Bath & Body Works. Originale din SUA, 3 magazine în Chișinău.',
      keywords: 'parfum victoria secret, parfumuri victoria secret chisinau, bombshell parfum, parfum dama moldova, parfum tease, духи victoria secret'
    },
    ru: {
      h1: 'Духи Victoria\'s Secret',
      title: 'Духи Victoria\'s Secret: Bombshell, Tease | Secret Room',
      description: 'Духи Victoria\'s Secret Bombshell, Tease, Very Sexy и Bare, мини-парфюмы и Bath & Body Works. Оригинал из США, 3 магазина в Кишинёве.',
      keywords: 'духи victoria secret, виктория сикрет духи, духи bombshell, женские духи кишинев, духи молдова, parfum victoria secret'
    }
  },
  // id 8 — «Costume de baie» / «Купальники». Бренды: только VS — BBW нет
  8: {
    ro: {
      h1: 'Costume de baie damă',
      title: 'Costume de baie damă Victoria\'s Secret | Secret Room',
      description: 'Costume de baie Victoria\'s Secret: bikini, slip brazilian, sutiene push-up de baie. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'costume de baie dama, costum de baie victoria secret, bikini chisinau, costume de baie moldova, slip brazilian, купальники кишинев'
    },
    ru: {
      h1: 'Женские купальники',
      title: 'Купальники Victoria\'s Secret: бикини | Secret Room',
      description: 'Купальники Victoria\'s Secret: бикини, плавки бразилиана, лифы пуш-ап. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'женские купальники, купальник victoria secret, бикини кишинев, купальники молдова, плавки бразилиана, costume de baie'
    }
  },
  // id 9 — «Spray-uri pentru corp» / «Спреи для тела». GSC: «spray de corp» 8, «body mist» 6. Бренды: VS, BBW, PINK
  9: {
    ro: {
      h1: 'Spray de corp și body mist',
      title: 'Spray de corp și body mist Victoria\'s Secret, BBW | Secret Room',
      description: 'Spray-uri de corp și body mist Victoria\'s Secret, Bath & Body Works și PINK, inclusiv shimmer. Originale din SUA, 3 magazine în Chișinău.',
      keywords: 'spray de corp, body mist, spray de corp victoria secret, spray parfumat corp chisinau, spray shimmer, спрей для тела'
    },
    ru: {
      h1: 'Спреи и мисты для тела',
      title: 'Спреи и мисты для тела Victoria\'s Secret, BBW | Secret Room',
      description: 'Спреи и мисты для тела Victoria\'s Secret, Bath & Body Works и PINK, в том числе с шиммером. Оригинал из США, 3 магазина в Кишинёве.',
      keywords: 'спрей для тела, мист для тела, body mist victoria secret, парфюмированный спрей кишинев, спрей с шиммером, spray de corp'
    }
  },
  // id 10 — «Loțiuni» / «Лосьоны». Бренды: VS, BBW, PINK
  10: {
    ro: {
      h1: 'Loțiuni de corp',
      title: 'Loțiune de corp Victoria\'s Secret, BBW | Secret Room',
      description: 'Loțiuni de corp parfumate Victoria\'s Secret, Bath & Body Works și PINK, în aromele spray-urilor. Originale din SUA, 3 magazine în Chișinău.',
      keywords: 'lotiune de corp, lotiune parfumata victoria secret, lotiune bath and body works, lotiune corp chisinau, lotiuni moldova, лосьон для тела'
    },
    ru: {
      h1: 'Лосьоны для тела',
      title: 'Лосьоны для тела Victoria\'s Secret, BBW | Secret Room',
      description: 'Парфюмированные лосьоны для тела Victoria\'s Secret, Bath & Body Works и PINK в ароматах спреев. Оригинал из США, 3 магазина в Кишинёве.',
      keywords: 'лосьон для тела, парфюмированный лосьон, лосьон victoria secret, лосьон bath and body works, лосьон кишинев, lotiune de corp'
    }
  },
  // id 11 — «Colecție de lux» / «Люксовая коллекция». Бренд: только VS (Fine Fragrance — спреи и лосьоны)
  11: {
    ro: {
      h1: 'Colecția de lux Victoria\'s Secret',
      title: 'Colecția de lux Victoria\'s Secret: spray, loțiuni | Secret Room',
      description: 'Spray-uri de corp și loțiuni Victoria\'s Secret Fine Fragrance: Bombshell, Very Sexy, Tease. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'colectia de lux victoria secret, fine fragrance victoria secret, spray de corp lux, lotiune lux, bombshell very sexy, люксовая коллекция'
    },
    ru: {
      h1: 'Люксовая коллекция Victoria\'s Secret',
      title: 'Люксовая коллекция Victoria\'s Secret: спреи | Secret Room',
      description: 'Спреи и лосьоны для тела Victoria\'s Secret Fine Fragrance: Bombshell, Very Sexy, Tease. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'люксовая коллекция victoria secret, fine fragrance victoria secret, спрей для тела люкс, лосьон люкс, bombshell very sexy, colectia de lux'
    }
  },
  // id 12 — «Ulei pentru corp» / «Масло для тела». По составу — в основном баттеры. Бренды: BBW, VS
  12: {
    ro: {
      h1: 'Unt și ulei de corp',
      title: 'Unt și ulei de corp Bath & Body Works, VS | Secret Room',
      description: 'Unt de corp, body butter și ulei de corp Bath & Body Works și Victoria\'s Secret. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'unt de corp, body butter, ulei de corp, unt de corp bath and body works, unt de corp chisinau, баттер для тела'
    },
    ru: {
      h1: 'Баттеры и масла для тела',
      title: 'Баттеры и масла для тела Bath & Body Works | Secret Room',
      description: 'Баттеры и масла для тела Bath & Body Works и Victoria\'s Secret. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'баттер для тела, масло для тела, body butter, баттер bath and body works, баттер кишинев, unt de corp'
    }
  },
  // id 13 — «Creme» / «Крема». Бренд: только BBW (Ultimate Hydration Body Cream)
  13: {
    ro: {
      h1: 'Creme de corp',
      title: 'Cremă de corp Bath & Body Works | Secret Room',
      description: 'Creme de corp hidratante Bath & Body Works Ultimate Hydration în aromele preferate. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'crema de corp, crema de corp bath and body works, crema hidratanta corp, ultimate hydration, crema corp chisinau, крем для тела'
    },
    ru: {
      h1: 'Кремы для тела',
      title: 'Крем для тела Bath & Body Works | Secret Room',
      description: 'Увлажняющие кремы для тела Bath & Body Works Ultimate Hydration в любимых ароматах. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'крем для тела, крем bath and body works, увлажняющий крем для тела, ultimate hydration, крем кишинев, crema de corp'
    }
  },
  // id 14 — «Geluri de duș» / «Гели для душа». Бренды: BBW, VS, PINK
  14: {
    ro: {
      h1: 'Geluri de duș',
      title: 'Gel de duș Bath & Body Works, Victoria\'s Secret | Secret Room',
      description: 'Geluri de duș parfumate Bath & Body Works, Victoria\'s Secret și PINK. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'gel de dus, gel de dus bath and body works, gel de dus parfumat, gel de dus victoria secret, gel de dus chisinau, гель для душа'
    },
    ru: {
      h1: 'Гели для душа',
      title: 'Гели для душа Bath & Body Works, Victoria\'s Secret | Secret Room',
      description: 'Парфюмированные гели для душа Bath & Body Works, Victoria\'s Secret и PINK. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'гель для душа, гель для душа bath and body works, парфюмированный гель для душа, гель victoria secret, гель кишинев, gel de dus'
    }
  },
  // id 15 — «Lumânări» / «Свечи». Бренды: BBW, VS
  15: {
    ro: {
      h1: 'Lumânări parfumate',
      title: 'Lumânări parfumate Bath & Body Works | Secret Room',
      description: 'Lumânări parfumate Bath & Body Works cu trei fitiluri și cu un fitil, plus Victoria\'s Secret. Originale din SUA, 3 magazine în Chișinău.',
      keywords: 'lumanari parfumate, lumanare bath and body works, lumanare cu trei fitiluri, lumanari chisinau, lumanari moldova, ароматические свечи'
    },
    ru: {
      h1: 'Ароматические свечи',
      title: 'Ароматические свечи Bath & Body Works | Secret Room',
      description: 'Ароматические свечи Bath & Body Works с тремя фитилями и с одним, а также Victoria\'s Secret. Оригинал из США, 3 магазина в Кишинёве.',
      keywords: 'ароматические свечи, свеча bath and body works, свеча с тремя фитилями, свечи кишинев, свечи молдова, lumanari parfumate'
    }
  },
  // id 16 — «Îngrijirea feței» / «Уход за лицом». Бренды: Charlotte Tilbury, VS
  16: {
    ro: {
      h1: 'Îngrijirea feței',
      title: 'Îngrijirea feței și iluminatoare Charlotte Tilbury | Secret Room',
      description: 'Iluminatoare Charlotte Tilbury Beauty Light Wand și cremă hidratantă pentru față Victoria\'s Secret. Originale, 3 magazine în Chișinău.',
      keywords: 'ingrijirea fetei, iluminator charlotte tilbury, beauty light wand, crema pentru fata, ingrijire fata chisinau, уход за лицом'
    },
    ru: {
      h1: 'Уход за лицом',
      title: 'Уход за лицом и хайлайтеры Charlotte Tilbury | Secret Room',
      description: 'Хайлайтеры Charlotte Tilbury Beauty Light Wand и увлажняющий крем для лица Victoria\'s Secret. Оригинал, 3 магазина в Кишинёве.',
      keywords: 'уход за лицом, хайлайтер charlotte tilbury, beauty light wand, крем для лица, уход за лицом кишинев, ingrijirea fetei'
    }
  },
  // id 17 — «Scrub-uri» / «Скрабы». Бренды: BBW, VS, PINK
  17: {
    ro: {
      h1: 'Scrub de corp',
      title: 'Scrub de corp Bath & Body Works, Victoria\'s Secret | Secret Room',
      description: 'Scrub-uri exfoliante pentru corp Bath & Body Works, Victoria\'s Secret și PINK. Originale din SUA, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'scrub de corp, scrub bath and body works, scrub exfoliant corp, scrub victoria secret, scrub chisinau, скраб для тела'
    },
    ru: {
      h1: 'Скрабы для тела',
      title: 'Скрабы для тела BBW, Victoria\'s Secret | Secret Room',
      description: 'Отшелушивающие скрабы для тела Bath & Body Works, Victoria\'s Secret и PINK. Оригинал из США, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'скраб для тела, скраб bath and body works, отшелушивающий скраб, скраб victoria secret, скраб кишинев, scrub de corp'
    }
  },
  // id 18 — «Glosuri de buze» / «Блески для губ». Бренды: VS, Kiko Milano
  18: {
    ro: {
      h1: 'Luciu de buze',
      title: 'Luciu de buze Victoria\'s Secret, Kiko Milano | Secret Room',
      description: 'Luciu de buze Victoria\'s Secret Flavor Gloss, uleiuri și balsamuri de buze Kiko Milano 3D Hydra. Originale, livrare în Moldova, 3 magazine în Chișinău.',
      keywords: 'luciu de buze, gloss victoria secret, flavor gloss, balsam de buze kiko, luciu de buze chisinau, блеск для губ'
    },
    ru: {
      h1: 'Блески для губ',
      title: 'Блески для губ Victoria\'s Secret, Kiko Milano | Secret Room',
      description: 'Блески для губ Victoria\'s Secret Flavor Gloss, масла и бальзамы для губ Kiko Milano 3D Hydra. Оригинал, доставка по Молдове, 3 магазина в Кишинёве.',
      keywords: 'блеск для губ, gloss victoria secret, flavor gloss, бальзам для губ kiko, блеск для губ кишинев, luciu de buze'
    }
  }
};

export function getCategorySeo(categoryId: number | null | undefined, lang: string): CategorySeoLocale | null {
  if (categoryId === null || categoryId === undefined) return null;
  const entry = CATEGORY_SEO[categoryId];
  if (!entry) return null;
  return lang === 'ru' ? entry.ru : entry.ro;
}
