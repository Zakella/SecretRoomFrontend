export interface CategoryDto {
  id: number;
  parentCategoryId: number | null;

  name: string;
  nameRu: string;
  nameRo: string;

  descriptionRu: string;
  descriptionRo: string;

  imageUrl: string;

  active: boolean;
  deleted: boolean;
  sort: number;

  children: CategoryDto[] | null;
}

export type Category = CategoryDto;
export type SubCategory = CategoryDto;

export interface Brand{
  brand: string;
  brandAlias: string;
}
