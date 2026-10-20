/** Соседняя карточка той же модели товара (контракт SiblingDTO). Текущая карточка входит в список с current=true. */
export interface ProductSibling {
  appId: number;
  name: string;
  nameRu: string;
  nameRo: string;
  optionType: string;
  optionLabelRu: string;
  optionLabelRo: string;
  swatchUrl: string | null;
  thumbnail: string | null;
  inStock: boolean;
  current: boolean;
}
