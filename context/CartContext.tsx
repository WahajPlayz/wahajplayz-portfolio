import React, { createContext, useContext, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useCurrency } from '@/context/CurrencyContext';
import { StoreProduct } from '@/config/storeConfig';
import { startStoreCheckout } from '@/lib/stripeCheckout';

export interface CartVariantSelection {
  colorId: string;
  colorLabel: string;
  type: string;
  size: string;
}

export interface CartItem {
  id: string;
  productId: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  maxQuantity: number;
  variant: CartVariantSelection;
}

interface AddCartItemInput {
  product: StoreProduct;
  quantity: number;
  maxQuantity: number;
  variant: CartVariantSelection;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  isOpen: boolean;
  checkoutLoading: boolean;
  checkoutError: string;
  openCart: () => void;
  closeCart: () => void;
  addItem: (input: AddCartItemInput) => void;
  updateQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  checkout: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const buildItemId = (productId: string, variant: CartVariantSelection) =>
  `${productId}:${variant.colorId}:${variant.type}:${variant.size}`;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const { currency } = useCurrency();
  const { user, openAuthModal } = useAuth();

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addItem = ({ product, quantity, maxQuantity, variant, image }: AddCartItemInput) => {
    const id = buildItemId(product.id, variant);
    setCheckoutError('');
    setItems(current => {
      const existing = current.find(item => item.id === id);
      if (existing) {
        return current.map(item => item.id === id
          ? { ...item, quantity: Math.min(item.maxQuantity, item.quantity + quantity) }
          : item
        );
      }

      return [
        ...current,
        {
          id,
          productId: product.id,
          name: product.name,
          price: product.price,
          image,
          quantity: Math.min(maxQuantity, quantity),
          maxQuantity,
          variant,
        },
      ];
    });
    openCart();
  };

  const updateQuantity = (id: string, quantity: number) => {
    setItems(current => current.flatMap(item => {
      if (item.id !== id) return [item];
      const nextQuantity = Math.max(0, Math.min(item.maxQuantity, quantity));
      return nextQuantity > 0 ? [{ ...item, quantity: nextQuantity }] : [];
    }));
  };

  const removeItem = (id: string) => {
    setItems(current => current.filter(item => item.id !== id));
  };

  const launchCheckout = async () => {
    setCheckoutError('');
    setCheckoutLoading(true);
    try {
      await startStoreCheckout(items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        variantLabel: `${item.variant.colorLabel} / ${item.variant.type} / ${item.variant.size}`,
      })), currency.code);
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : 'Failed to start checkout.');
      setCheckoutLoading(false);
    }
  };

  const checkout = async () => {
    if (items.length === 0) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (!user) {
      openAuthModal(() => { void launchCheckout(); });
      return;
    }

    await launchCheckout();
  };

  return (
    <CartContext.Provider value={{ items, subtotal, isOpen, checkoutLoading, checkoutError, openCart, closeCart, addItem, updateQuantity, removeItem, checkout }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
