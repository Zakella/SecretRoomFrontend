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
