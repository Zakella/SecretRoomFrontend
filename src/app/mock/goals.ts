import {Product} from '../entities/product';

export const MOCK_PRODUCTS: Product[] = [

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
