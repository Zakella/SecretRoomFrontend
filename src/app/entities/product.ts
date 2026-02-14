import {ProductImage} from "./product-image";
import {ProductCategory} from "./product-category";
import {Size} from './size';
import {ProductVariant} from './product-variant';

export interface Product {
  id?: string,
  appId?: string,
  sku?: string,
  article?: string,
  name?: string,
  nameRo?: string,
  nameRu?: string,
  description?: string,
  descriptionRo?: string,
  descriptionRu?: string,
  shortDescription?: string,
  shortDescriptionRo?: string,
  shortDescriptionRu?: string,
  productCategory?: ProductCategory,
  price?: number | 0,
  imageURL: string | null,
  active?: boolean,
  inStock?: boolean,
  unitsInStock?: number,
  size: string | null,
  brand?: string,
  brandAlias?: string,
  brandShortName?: string,
  productImagesWebStore?: ProductImage[],
  productSizes?: Size[],
  discountPercent: number,
  oldPrice: number,
  isNew: boolean,
  isBestSeller: boolean,
  variants?: ProductVariant[],
  discontinued?: boolean,
}
