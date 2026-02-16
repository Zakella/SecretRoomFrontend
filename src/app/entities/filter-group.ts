export interface FilterGroupValue {
  slug: string;
  valueRo?: string;
  valueRu?: string;
  count: number;
}

export interface FilterGroup {
  slug: string;
  nameRo?: string;
  nameRu?: string;
  values: FilterGroupValue[];
}
