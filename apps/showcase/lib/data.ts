import type { Product } from '@respin/ui';

export interface Item extends Product {
  condition: string;
  category: string;
  sellerId: number;
  description: string;
}

export const sellers: Record<number, { name: string; city: string; rating: number; reviews: number; certified: boolean }> = {
  1: { name: 'Mette K.', city: 'København V', rating: 4.9, reviews: 120, certified: true },
  2: { name: 'Jonas P.', city: 'Odense C', rating: 4.7, reviews: 56, certified: false },
  3: { name: 'Sofie L.', city: 'Aarhus N', rating: 5, reviews: 31, certified: false }
};

export const items: Item[] = [
  { id: 1, title: 'Vintage ruskindstaske', brand: 'Vintage', size: 'One size', price: 320, condition: 'God men brugt', category: 'Tasker', sellerId: 1, description: 'Smuk 70’er-taske i blødt ruskind. Lidt patina på remmen, ellers i rigtig fin stand.' },
  { id: 2, title: 'Ganni uldjakke', brand: 'Ganni', size: 'M', price: 450, condition: 'Næsten ny', category: 'Vintage', sellerId: 3, description: 'Brugt to gange. Tyk uldblanding, perfekt til efteråret.' },
  { id: 3, title: 'Adidas Samba OG', brand: 'Adidas', size: '41', price: 350, condition: 'God men brugt', category: 'Sneakers', sellerId: 2, description: 'Klassiske Samba i hvid/sort. Brugt en sæson og rengjort.' },
  { id: 4, title: 'Levi’s 501 denim', brand: 'Levi’s', size: 'W30 L32', price: 280, condition: 'God men brugt', category: 'Vintage', sellerId: 2, description: 'Vintage 501 med den helt rigtige vask.' },
  { id: 5, title: 'Carhartt WIP hættetrøje', brand: 'Carhartt', size: 'L', price: 390, condition: 'Næsten ny', category: 'Gade-stil', sellerId: 2, description: 'Tung hoodie i sand. Brugt få gange.' },
  { id: 6, title: 'Nike Air Max 90', brand: 'Nike', size: '43', price: 520, condition: 'Som ny', category: 'Sneakers', sellerId: 1, description: 'Kun brugt indendørs. Original æske medfølger.' }
];

export const categories = [
  { label: 'Vintage', icon: 'shirt' }, { label: 'Gade-stil', icon: 'hoodie' }, { label: 'Sneakers', icon: 'sneaker' },
  { label: 'Tasker', icon: 'bag' }, { label: 'Bolig', icon: 'home2' }, { label: 'Børn', icon: 'baby' }
] as const;

export const conversations = [
  { id: 1, name: 'Mette K.', preview: 'Hej! Er den stadig til salg?', time: '9:41', unread: true, online: true, itemTitle: 'Vintage ruskindstaske' },
  { id: 2, name: 'Sofie L.', preview: 'Tak for handlen – sender i morgen!', time: 'I går', unread: false, itemTitle: 'Ganni uldjakke' },
  { id: 3, name: 'Jonas P.', preview: 'Du: Kan du gå ned til 300 kr.?', time: 'Tirs.', unread: true, itemTitle: 'Adidas Samba OG' }
] as const;
