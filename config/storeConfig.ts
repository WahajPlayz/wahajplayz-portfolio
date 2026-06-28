export interface StoreProduct {
  id: string;
  name: string;
  description: string;
  price: number;
  salePercent?: number;
  type: 'digital';
  category: string;
  coverImage: string;
  polarProductId?: string;
  digitalFileUrl?: string;
  digitalFilePath?: string;
  digitalFileName?: string;
  stock: number | null;
  enabled: boolean;
  featured: boolean;
  tags: string[];
  galleryImages?: string[];
  features?: string[];
  cautions?: string[];
  warningMessage?: string;
  colorOptions?: { id: string; label: string; hex: string; imageUrl?: string }[];
  typeOptions?: string[];
  sizeOptions?: string[];
  bulkDiscounts?: { label: string; minQuantity: number; percentOff: number }[];
  reviews?: { id: string; reviewer: string; rating: number; date: string; comment: string }[];
  customFields?: { id: string; label: string; type: 'text' | 'select' | 'color-picker'; options?: string[]; colorSwatches?: { name: string; hex: string }[]; required: boolean; placeholder?: string }[];
}

export interface StoreConfig {
  enabled: boolean;
  heading: string;
  subheading: string;
  storePage: { headline: string; subheading: string };
  categories: string[];
  products: StoreProduct[];
}

export const storeDefaults: StoreConfig = {
  enabled: true,
  heading: 'Shop',
  subheading: 'Grab something cool — digital downloads.',
  storePage: {
    headline: 'The Shop',
    subheading: 'Support the project and take something home.',
  },
  categories: ['Game Assets', 'Art', 'Source Code'],
  products: [],
};
