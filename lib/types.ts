export type Drink = {
  id: string;
  name: string;
  count: number;
  category: string | null;
  tappedAt?: string[];
  createdAt?: string;
};

export type MenuItem = { name: string; category: string };
