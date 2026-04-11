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
  customAnswers?: Record<string, string>;
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
  effectivePrice?: number;
}

interface CartContextType {
  items: CartItem[];
  subtotal: number;
  isOpen: boolean;
  authLoading: boolean;
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
  const { user, authLoading, openAuthModal } = useAuth();

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const openCart = () => setIsOpen(true);
  const closeCart = () => setIsOpen(false);

  const addItem = ({ product, quantity, maxQuantity, variant, image, effectivePrice }: AddCartItemInput) => {
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
          price: effectivePrice ?? product.price,
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
      await startStoreCheckout(items.map(item => {
        const parts: string[] = [];
        if (item.variant.colorLabel) parts.push(`Colour: ${item.variant.colorLabel}`);
        if (item.variant.type) parts.push(`Type: ${item.variant.type}`);
        if (item.variant.size) parts.push(`Size: ${item.variant.size}`);
        if (item.variant.customAnswers) {
          Object.entries(item.variant.customAnswers).forEach(([label, value]) => {
            if (value) parts.push(`${label}: ${value}`);
          });
        }
        return {
          productId: item.productId,
          quantity: item.quantity,
          variantLabel: parts.join(' | '),
        };
      }), currency.code);
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

    if (authLoading) {
      setCheckoutError('Sign-in is still loading. Please wait a moment and try again.');
      return;
    }

    if (!user) {
      openAuthModal(() => { void launchCheckout(); });
      return;
    }

    await launchCheckout();
  };

  return (
    <CartContext.Provider value={{ items, subtotal, isOpen, authLoading, checkoutLoading, checkoutError, openCart, closeCart, addItem, updateQuantity, removeItem, checkout }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
};
