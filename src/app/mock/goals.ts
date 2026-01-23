import {Product} from '../entities/product';

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



export  const  ORDERS = [
  {
    id: '100213',
    date: new Date('2025-07-26'),
    status: 'Доставлен',
    total: 59.99,
    items: [
      {
        title: 'Glow Nectar Face Oil',
        quantity: 1,
        price: 39.99,
        image: 'assets/images/demo/main.jpeg'
      },
      {
        title: 'Rose Lip Balm',
        quantity: 1,
        price: 20.00,
        image: 'assets/images/demo/main.jpeg'
      }
    ]
  },
  {
    id: '100212',
    date: new Date('2025-07-18'),
    status: 'В обработке',
    total: 25.00,
    items: [
      {
        title: 'Hydra Mist Toner',
        quantity: 1,
        price: 25.00,
        image: 'assets/images/demo/main.jpeg'
      }
    ]
  }
];
