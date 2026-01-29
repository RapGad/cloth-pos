export interface Product {
  id: number;
  name: string;
  cost_price: number;
  selling_price: number;
  tax_rate: number;
  category?: string;
  created_at?: string;
}

export interface Variant {
  id: number;
  product_id: number;
  size: string;
  color: string;
  stock_qty: number;
}

export interface ProductWithVariants extends Product {
  variants: Variant[];
}

export interface CartItem {
  variantId: number;
  productId: number;
  name: string;
  size: string;
  color: string;
  cost_price: number;
  selling_price: number;
  qty: number;
  discount: number;
}

export interface Sale {
  id: number;
  timestamp: string;
  total: number;
  payment_method: 'cash' | 'card' | 'mobile';
  items: SaleItem[];
}

export interface SaleItem {
  id: number;
  sale_id: number;
  variant_id: number;
  qty: number;
  cost_at_sale: number;
  price_at_sale: number;
  discount: number;
}
