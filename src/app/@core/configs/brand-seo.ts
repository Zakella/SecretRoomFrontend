/**
 * Ручные SEO-тексты по брендам.
 *
 * Один шаблон на все бренды давал near-duplicate между шестью URL и был фактически неверен
 * (Ann Summers описывался как магазин лосьонов и косметики, Charlotte Tilbury — как бельё).
 * Здесь описания написаны по реальному ассортименту каждого бренда — как это уже сделано
 * вручную для /catalog/vs и /catalog/bb, единственных двух страниц каталога, которые ранжируются.
 *
 * Ключ — слаг бренда (BrandService.toSlug), тот же, что в URL /{lang}/catalog/brand/{slug}.
 * Бренда нет в словаре — работает generic-шаблон в Catalog.updateMeta().
 */

export interface BrandSeoLocale {
  /** <title> страницы */
  title: string;
  /** <meta name="description"> — держать в пределах ~160 символов */
  description: string;
  keywords: string;
  /** h2 SEO-блока внизу страницы */
  heading: string;
  /** Абзацы SEO-блока. Обычный текст, без разметки. */
  paragraphs: string[];
}

export interface BrandSeo {
  ro: BrandSeoLocale;
  ru: BrandSeoLocale;
}

export const BRAND_SEO: Record<string, BrandSeo> = {
  'victorias-secret': {
    ro: {
      title: "Victoria's Secret — catalog complet în Moldova | Secret Room",
      description: "Catalog complet Victoria's Secret în Moldova: sutiene, chiloți, pijamale, costume de baie, parfumuri, spray-uri de corp și loțiuni. Import din SUA.",
      keywords: "victoria secret moldova, victoria secret chisinau, sutiene victoria secret, parfum victoria secret, spray de corp victoria secret, victoria secret молдова, парфюм victoria secret кишинев",
      heading: "Victoria's Secret în Moldova",
      paragraphs: [
        "Aici este tot ce avem de la Victoria's Secret — lenjerie și îmbrăcăminte de casă alături de întreaga linie de parfumuri și îngrijire a corpului. Sutiene push-up, bralette, plunge și balconette, chiloți tanga, brazilian, cheeky și hiphugger, pijamale din satin și modal, costume de baie, seturi cadou.",
        "Din parfumerie: eau de parfum și travel spray, fine fragrance mist, loțiuni și spray-uri cu shimmer din colecțiile Bombshell, Bare Vanilla, Tease, Love Spell. Toate produsele sunt originale, aduse din SUA.",
        "Poți comanda online cu livrare în Chișinău și în toată Moldova sau poți trece prin magazinele noastre din Chișinău, ca să probezi mărimea înainte de cumpărare."
      ]
    },
    ru: {
      title: "Victoria's Secret — полный каталог в Молдове | Secret Room",
      description: "Полный каталог Victoria's Secret в Молдове: бюстгальтеры, трусики, пижамы, купальники, парфюмы, спреи для тела и лосьоны. Импорт из США.",
      keywords: "victoria secret молдова, victoria secret кишинев, бюстгальтеры victoria secret, парфюм victoria secret, спрей для тела victoria secret, купить victoria secret молдова",
      heading: "Victoria's Secret в Молдове",
      paragraphs: [
        "Здесь весь ассортимент Victoria's Secret — бельё и домашняя одежда вместе с полной линейкой парфюмерии и ухода за телом. Бюстгальтеры push-up, бралетты, plunge и balconette, трусики танга, бразилиана, cheeky и хипхаггеры, пижамы из сатина и модала, купальники, подарочные наборы.",
        "Из парфюмерии: eau de parfum и travel spray, fine fragrance mist, лосьоны и спреи с шиммером из коллекций Bombshell, Bare Vanilla, Tease, Love Spell. Вся продукция оригинальная, привезена из США.",
        "Можно заказать онлайн с доставкой по Кишинёву и всей Молдове или зайти в наши магазины в Кишинёве и примерить размер перед покупкой."
      ]
    }
  },

  'pink': {
    ro: {
      title: "PINK by Victoria's Secret — Sutiene, Chiloți, Loțiuni | Secret Room",
      description: "PINK în Moldova: sutiene Wear Everywhere și PINK Wink, chiloți tanga și cheeky, loțiuni de corp și spray-uri cu shimmer. Linia tânără Victoria's Secret.",
      keywords: "pink victoria secret moldova, pink victoria secret chisinau, sutien pink wink, lotiune pink, wear everywhere, pink victoria secret молдова, лосьон pink",
      heading: "PINK by Victoria's Secret în Moldova",
      paragraphs: [
        "PINK este linia tânără a Victoria's Secret — mai lejeră, mai colorată și mai accesibilă ca preț. La noi găsești sutiene din seriile Wear Everywhere și PINK Wink: push-up, balconette, fără sârmă și fără bretele, în Coconut White, Boardwalk Pink, Marzipan, Black.",
        "Pe partea de chiloți — tanga micro și flutter, cheeky, V-string, modele din dantelă și cu talie lată. Separat, îngrijirea corpului PINK: loțiuni Classic și Brown Sugar, creme cu shimmer, spray-uri de corp în arome Coconut, Warm & Cozy, Pink Pineapple.",
        "Produse originale Victoria's Secret. Livrare în Chișinău și în toată Moldova, achitare la primire."
      ]
    },
    ru: {
      title: "PINK от Victoria's Secret — бельё, лосьоны, спреи | Secret Room",
      description: "PINK в Молдове: бюстгальтеры Wear Everywhere и PINK Wink, трусики танга и cheeky, лосьоны для тела и спреи с шиммером. Молодёжная линия Victoria's Secret.",
      keywords: "pink victoria secret молдова, pink victoria secret кишинев, бюстгальтер pink wink, лосьон pink, wear everywhere, купить pink молдова",
      heading: "PINK by Victoria's Secret в Молдове",
      paragraphs: [
        "PINK — молодёжная линия Victoria's Secret: проще, ярче и дешевле основной. У нас есть бюстгальтеры серий Wear Everywhere и PINK Wink: push-up, balconette, без косточек и без бретелей, в цветах Coconut White, Boardwalk Pink, Marzipan, Black.",
        "Из трусиков — танга micro и flutter, cheeky, V-string, кружевные модели и с широким поясом. Отдельно уход за телом PINK: лосьоны Classic и Brown Sugar, кремы с шиммером, спреи для тела в ароматах Coconut, Warm & Cozy, Pink Pineapple.",
        "Оригинальная продукция Victoria's Secret. Доставка по Кишинёву и всей Молдове, оплата при получении."
      ]
    }
  },

  'bath-and-body': {
    ro: {
      title: "Bath & Body Works — catalog complet în Moldova | Secret Room",
      description: "Catalog Bath & Body Works: fine fragrance mist, lumânări cu 3 fitile, loțiuni și creme de corp, geluri de duș. Champagne Toast, A Thousand Wishes.",
      keywords: "bath and body works moldova, bath body works chisinau, lumanari bath body works, fine fragrance mist, lotiune bath body works, bath body works молдова, свечи bath body works",
      heading: "Bath & Body Works în Moldova",
      paragraphs: [
        "Catalogul complet Bath & Body Works: fine fragrance mist și cologne mist, lumânări cu 3 fitile și single wick, loțiuni de corp, Ultimate Hydration Body Cream, body butter, geluri de duș și săpunuri spumante.",
        "Arome care se caută cel mai des: Champagne Toast, A Thousand Wishes, Japanese Cherry Blossom, Mahogany Teakwood, Gingham, Moonlight Path, plus colecțiile sezoniere care apar de câteva ori pe an.",
        "Produse originale, aduse din SUA. Comandă online cu livrare în toată Moldova sau vino în magazinele Secret Room din Chișinău."
      ]
    },
    ru: {
      title: "Bath & Body Works — полный каталог в Молдове | Secret Room",
      description: "Каталог Bath & Body Works: спреи fine fragrance mist, свечи с 3 фитилями, лосьоны и кремы для тела, гели для душа. Champagne Toast, A Thousand Wishes.",
      keywords: "bath and body works молдова, bath body works кишинев, свечи bath body works, fine fragrance mist, лосьон bath body works, купить bath body works",
      heading: "Bath & Body Works в Молдове",
      paragraphs: [
        "Полный каталог Bath & Body Works: спреи fine fragrance mist и cologne mist, свечи с 3 фитилями и одинарные, лосьоны для тела, Ultimate Hydration Body Cream, баттеры, гели для душа и пенящееся мыло.",
        "Самые востребованные ароматы: Champagne Toast, A Thousand Wishes, Japanese Cherry Blossom, Mahogany Teakwood, Gingham, Moonlight Path, плюс сезонные коллекции, которые выходят несколько раз в год.",
        "Оригинальная продукция из США. Заказывайте онлайн с доставкой по всей Молдове или заходите в магазины Secret Room в Кишинёве."
      ]
    }
  },

  'kiko-milano': {
    ro: {
      title: "Kiko Milano Moldova — Glosuri și uleiuri de buze | Secret Room",
      description: "Kiko Milano în Chișinău: glosuri de buze 3D Hydra, uleiuri de buze, creioane Lip Volume Stylo și seturi cadou. Ediții Just Cavalli și Bridgerton.",
      keywords: "kiko milano moldova, kiko milano chisinau, gloss kiko milano, ulei de buze kiko, 3d hydra lip gloss, kiko milano молдова, блеск для губ kiko",
      heading: "Kiko Milano în Moldova",
      paragraphs: [
        "Kiko Milano la Secret Room este machiajul de buze: glosuri 3D Hydra Lip Gloss, uleiuri de buze 3D Hydra Lip Oil, creioane Lip Volume Stylo și seturi cadou pentru buze.",
        "Avem și ediții limitate — colaborarea Just Cavalli X Kiko Milano Rebel Edition, colecția Bridgerton Brilliant Bliss, Juicy Fizz și seturile de sărbători Snow-Kissed Holiday.",
        "Produse originale Kiko Milano. Selecția este restrânsă și se schimbă des — dacă vezi o nuanță care îți place, merită luată. Livrare în Chișinău și în toată Moldova."
      ]
    },
    ru: {
      title: "Kiko Milano Молдова — блески и масла для губ | Secret Room",
      description: "Kiko Milano в Кишинёве: блески для губ 3D Hydra, масла для губ, карандаши Lip Volume Stylo и подарочные наборы. Just Cavalli и Bridgerton.",
      keywords: "kiko milano молдова, kiko milano кишинев, блеск для губ kiko, масло для губ kiko, 3d hydra lip gloss, купить kiko milano молдова",
      heading: "Kiko Milano в Молдове",
      paragraphs: [
        "Kiko Milano в Secret Room — это макияж губ: блески 3D Hydra Lip Gloss, масла для губ 3D Hydra Lip Oil, карандаши Lip Volume Stylo и подарочные наборы для губ.",
        "Есть и лимитированные выпуски — коллаборация Just Cavalli X Kiko Milano Rebel Edition, коллекция Bridgerton Brilliant Bliss, Juicy Fizz и праздничные наборы Snow-Kissed Holiday.",
        "Оригинальная продукция Kiko Milano. Подборка небольшая и часто меняется — если увидели подходящий оттенок, лучше не откладывать. Доставка по Кишинёву и всей Молдове."
      ]
    }
  },

  'charlotte-tilbury': {
    ro: {
      title: "Charlotte Tilbury Moldova — Beauty Light Wand | Secret Room",
      description: "Charlotte Tilbury în Moldova: iluminatorul lichid Beauty Light Wand Pinkgasm, produs original. Disponibil la Secret Room, Chișinău.",
      keywords: "charlotte tilbury moldova, charlotte tilbury chisinau, beauty light wand, pinkgasm, iluminator charlotte tilbury, charlotte tilbury молдова",
      heading: "Charlotte Tilbury în Moldova",
      paragraphs: [
        "Selecția Charlotte Tilbury de la Secret Room este deocamdată una punctuală: iluminatorul lichid Beauty Light Wand în nuanța Pinkgasm — produsul cel mai cunoscut al brandului, cu finish satinat și aplicator tip burete.",
        "Produs original. Îl poți comanda online cu livrare în Chișinău și în toată Moldova sau îl poți vedea în magazinele noastre din Chișinău.",
        "Aducem Charlotte Tilbury în loturi mici. Dacă te interesează un anumit produs care nu apare aici, scrie-ne pe Instagram sau sună-ne — verificăm dacă îl putem aduce."
      ]
    },
    ru: {
      title: "Charlotte Tilbury Молдова — Beauty Light Wand | Secret Room",
      description: "Charlotte Tilbury в Молдове: жидкий хайлайтер Beauty Light Wand Pinkgasm, оригинал. В наличии в Secret Room, Кишинёв.",
      keywords: "charlotte tilbury молдова, charlotte tilbury кишинев, beauty light wand, pinkgasm, хайлайтер charlotte tilbury, купить charlotte tilbury",
      heading: "Charlotte Tilbury в Молдове",
      paragraphs: [
        "Подборка Charlotte Tilbury в Secret Room пока точечная: жидкий хайлайтер Beauty Light Wand в оттенке Pinkgasm — самый известный продукт бренда, с сатиновым финишем и аппликатором-спонжем.",
        "Оригинал. Можно заказать онлайн с доставкой по Кишинёву и всей Молдове или посмотреть в наших магазинах в Кишинёве.",
        "Charlotte Tilbury мы привозим небольшими партиями. Если нужен конкретный продукт, которого здесь нет, напишите нам в Instagram или позвоните — проверим, сможем ли привезти."
      ]
    }
  },

  'ann-summers': {
    ro: {
      title: "Ann Summers Moldova — Lenjerie și sutiene push-up | Secret Room",
      description: "Ann Summers în Moldova: sutiene push-up și plunge, chiloți tanga și brazilian, seturi din dantelă. Colecțiile Undeniable și Desiring Decadence.",
      keywords: "ann summers moldova, ann summers chisinau, lenjerie ann summers, sutien push-up ann summers, chiloti ann summers, ann summers молдова, белье ann summers",
      heading: "Ann Summers în Moldova",
      paragraphs: [
        "Ann Summers este brand britanic de lenjerie, iar la Secret Room aduce exact asta — lenjerie, nu cosmetice. Sutiene push-up cu decolteu adânc și modele plunge fără căptușeală, chiloți tanga și string, brazilian și seturi din dantelă.",
        "Colecțiile pe care le avem: Undeniable, Desiring Decadence, Enticement, Sexy Lace și setul Exuberant. Croiuri gândite pentru seară, nu pentru fiecare zi — dantelă, transparențe, detalii cu bretele.",
        "Produse originale, aduse din Marea Britanie. Livrare în Chișinău și în toată Moldova, sau probează în magazinele Secret Room din Chișinău."
      ]
    },
    ru: {
      title: "Ann Summers Молдова — бельё и push-up бюстгальтеры | Secret Room",
      description: "Ann Summers в Молдове: бюстгальтеры push-up и plunge, трусики танга и бразилиана, кружевные комплекты. Коллекции Undeniable и Desiring Decadence.",
      keywords: "ann summers молдова, ann summers кишинев, белье ann summers, бюстгальтер push-up ann summers, трусики ann summers, купить ann summers",
      heading: "Ann Summers в Молдове",
      paragraphs: [
        "Ann Summers — британский бренд нижнего белья, и в Secret Room он представлен именно бельём, а не косметикой. Бюстгальтеры push-up с глубоким вырезом и модели plunge без чашек с наполнителем, трусики танга и стринги, бразилиана и кружевные комплекты.",
        "Коллекции, которые у нас есть: Undeniable, Desiring Decadence, Enticement, Sexy Lace и комплект Exuberant. Крой скорее вечерний, чем повседневный — кружево, прозрачные вставки, ремешки.",
        "Оригинальная продукция из Великобритании. Доставка по Кишинёву и всей Молдове, или примерьте в магазинах Secret Room в Кишинёве."
      ]
    }
  }
};

export function getBrandSeo(slug: string | null, lang: string): BrandSeoLocale | null {
  if (!slug) return null;
  const entry = BRAND_SEO[slug];
  if (!entry) return null;
  return lang === 'ru' ? entry.ru : entry.ro;
}
