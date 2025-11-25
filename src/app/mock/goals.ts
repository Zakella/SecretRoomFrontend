import {Product} from '../entities/product';

export const GOALS = [
  { label: 'Dry Skin', image: '/assets/images/demo/goal1.jpg' },
  { label: 'Reduce Wrinkles', image: '/assets/images/demo/goal2.jpg' },
  { label: 'Damaged Hair', image: '/assets/images/demo/goal1.jpg' },
  { label: 'Clean Makeup', image: '/assets/images/demo/goal2.jpg' },
];





export const PROMOS_MOCK = [
  {
    id: 1,
    title: '🔥 Скидка 50% на Glow Nectar Face Oil',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString(),
    image: 'assets/images/demo/slider1.jpeg'
  },
  {
    id: 2,
    title: '🎁 Бесплатная доставка при заказе от $50',
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 5).toISOString(),
    image: 'assets/images/demo/slider1.jpeg'
  },
  {
    id: 3,
    title: '🌸 Скидка 20% на Rose Toner',
    expiresAt: new Date(Date.now() + 1000 * 60 * 10).toISOString(),
    image: 'assets/images/demo/slider1.jpeg'
  },
  {
    id: 4,
    title: '⚡ Flash Sale — Hydra Mist всего $15',
    expiresAt: new Date(Date.now() + 1000 * 20).toISOString(),
    image: 'assets/images/demo/slider1.jpeg'
  }
];



export const MOCK_PRODUCTS: Product[] = [
  {
    id: '1',
    sku: 'SHO-001',
    name: 'Nike Air Zoom Pegasus 40',
    nameRu: 'Кроссовки Nike Air Zoom Pegasus 40',
    description: 'Лёгкие и удобные кроссовки для бега и повседневной носки.',
    price: 129.99,
    oldPrice: 149.99,
    discountPercent: 13,
    brand: 'Nike',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 15,
    size: '42'
  },
  {
    id: '2',
    sku: 'SHO-002',
    name: 'Adidas Ultraboost 22',
    nameRu: 'Кроссовки Adidas Ultraboost 22',
    description: 'Максимальный комфорт и поддержка для любых дистанций.',
    price: 159.99,
    oldPrice: 189.99,
    discountPercent: 16,
    brand: 'Adidas',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 9,
    size: '43'
  },
  {
    id: '3',
    sku: 'SHO-003',
    name: 'Puma Velocity Nitro 3',
    nameRu: 'Кроссовки Puma Velocity Nitro 3',
    description: 'Амортизирующая подошва и лёгкий материал верха.',
    price: 119.99,
    oldPrice: 139.99,
    discountPercent: 14,
    brand: 'Puma',
    imageURL: 'https://images.rawpixel.com/image_800/cHJpdmF0ZS9sci9pbWFnZXMvd2Vic2l0ZS8yMDIyLTExL3BmLXMxMDgtcG0tNDExMy1tb2NrdXAuanBn.jpg',
    active: true,
    unitsInStock: 25,
    size: '41'
  }
];
