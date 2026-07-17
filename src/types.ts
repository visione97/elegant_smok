export interface Product {
  id: string;
  name: string;
  category: 'weed' | 'hash';
  tagline: string;
  description: string;
  cbd: number; // percentage
  thc: number; // percentage, e.g. < 0.5% for Italian legal limit
  aroma: string[];
  prices: {
    '1.5g': number;
    '5g': number;
    '10g': number;
  };
  image: string; // URL
  badge?: string; // e.g. "Best Seller", "New"
}

export type GramOption = '1.5g' | '5g' | '10g';

export interface CartItem {
  product: Product;
  selectedGram: GramOption;
  quantity: number;
}

