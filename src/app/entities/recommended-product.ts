import {Product} from './product';

export class RecommendedProduct {
  id: string | null = null;
  product: Product | null = null;
  owner: Product | null = null;
  ownerAppId: string | null = null;
  priority: number | 0 = 0;

}
