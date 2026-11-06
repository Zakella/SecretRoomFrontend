/** Physical stores of Secret Room in Chisinau: contacts page and store hold (SR-223). */

export interface StorePhoto {
  desktop: string;
  desktopWebp?: string;
  mobile?: string;
  mobileWebp?: string;
  landscape?: boolean;
}

export interface StoreBrand {
  name: string;
  /** Transloco key of the short brand description. */
  descriptionKey: string;
}

/** Code of the store in the store hold API (SR-223): fixed, webstore checks it. */
export type StoreCode = 'atrium' | 'eminescu' | 'secret-angel';

export interface Store {
  id: number;
  code: StoreCode;
  name: string;
  location: string;
  imgUrl: string;
  workTime: string;
  contact: string;
  latitude: number;
  longitude: number;
  isNew: boolean;
  photos: StorePhoto[];
  /** 'collage' renders photos as a grid above the map instead of the polaroid stack over it. */
  layout?: 'collage';
  brands?: StoreBrand[];
}

function secretAngelPhoto(name: string): StorePhoto {
  const base = `/stores/secret-angel/${name}`;
  return {
    desktop: `${base}-desktop.jpg`,
    desktopWebp: `${base}-desktop.webp`,
    mobile: `${base}-mobile.jpg`,
    mobileWebp: `${base}-mobile.webp`,
  };
}

export const STORES: readonly Store[] = [
  {
    id: 1,
    code: 'atrium',
    name: 'Secret Room',
    location: 'Atrium, et. 1 , but. 1029, str. Albişoara 4, Chișinău, Moldova',
    imgUrl: 'https://cosmeticshop.md/content/userfiles/images/cosmetic%20shop%20store-min.webp',
    workTime:  '10:00 - 21:00',
    contact: '060099775',
    latitude: 47.015438488623985,
    longitude: 28.856022676715895,
    isNew: false,
    photos: [
      {
        desktop: '/stores/atrium/atrium-collage-desktop.jpg',
        desktopWebp: '/stores/atrium/atrium-collage-desktop.webp',
        mobile: '/stores/atrium/atrium-collage-mobile.jpg',
        mobileWebp: '/stores/atrium/atrium-collage-mobile.webp',
        landscape: true,
      }
    ]
  },
  {
    id: 2,
    code: 'eminescu',
    name: 'Secret Room',
    imgUrl: 'https://cosmeticshop.md/content/userfiles/images/cosmetic%20shop%20store-min.webp',
    location: 'str. Eminescu 56, Chișinău, Moldova',
    workTime:  '10:00 - 21:00',
    contact: '060099775',
    latitude: 47.0211404,
    longitude: 28.8360804,
    isNew: true,
    photos: [
      { desktop: '/stores/eminescu/1.jpeg' }
    ]
  },
  {
    id: 3,
    code: 'secret-angel',
    name: 'Secret Angel',
    imgUrl: 'https://secretroom.md/stores/secret-angel/3-entrance-desktop.jpg',
    location: 'Atrium, et. 2, but. 2018, str. Albişoara 4, Chișinău, Moldova',
    workTime:  '10:00 - 21:00',
    contact: '060099775',
    latitude: 47.015438488623985,
    longitude: 28.856022676715895,
    isNew: true,
    layout: 'collage',
    photos: [
      secretAngelPhoto('3-entrance'),
      secretAngelPhoto('1-bbw-shelves'),
      secretAngelPhoto('2-pajamas-kiko'),
      secretAngelPhoto('4-lingerie-wall'),
    ],
    brands: [
      { name: 'Bath & Body Works', descriptionKey: 'storeBrands.bathAndBody' },
      { name: 'KIKO Milano', descriptionKey: 'storeBrands.kikoMilano' },
      { name: 'Nayomi', descriptionKey: 'storeBrands.nayomi' },
      { name: 'Ann Summers', descriptionKey: 'storeBrands.annSummers' },
      { name: 'PINK', descriptionKey: 'storeBrands.pink' },
    ]
  },
];

/** Store by its store hold code. */
export function storeByCode(code: string | null | undefined): Store | undefined {
  return STORES.find(s => s.code === code);
}
