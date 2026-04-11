import React, { useEffect } from 'react';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useCurrency } from '@/context/CurrencyContext';

const CartDrawer: React.FC = () => {
  const { items, subtotal, isOpen, closeCart, updateQuantity, removeItem, checkout, checkoutLoading, checkoutError, authLoading } = useCart();
  const { formatPrice } = useCurrency();

  useEffect(() => {
    const supportButton = document.getElementById('custom-support-btn');
    if (!supportButton) return;

    supportButton.style.display = isOpen ? 'none' : '';

    return () => {
      supportButton.style.display = '';
    };
  }, [isOpen]);

  return (
    <>
      <div
        className={`fixed inset-0 z-[120] bg-black/30 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        onClick={closeCart}
      />
      <aside className={`fixed top-0 right-0 z-[130] h-full w-full max-w-md bg-white text-slate-900 shadow-2xl transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Your Cart</p>
              <h2 className="mt-1 text-2xl font-bold">{items.length} item{items.length === 1 ? '' : 's'}</h2>
            </div>
            <button onClick={closeCart} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {items.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <ShoppingBag size={34} className="text-slate-300" />
                <p className="mt-4 text-lg font-semibold">Your cart is empty</p>
                <p className="mt-2 text-sm text-slate-500">Add something from the product page and it will appear here.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map(item => (
                  <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="flex gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-slate-300">
                            <ShoppingBag size={20} />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-xs text-slate-500">{item.variant.colorLabel} • {item.variant.type} • {item.variant.size}</p>
                          </div>
                          <button onClick={() => removeItem(item.id)} className="text-slate-400 transition-colors hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </div>
                        <div className="mt-4 flex items-center justify-between">
                          <div className="flex items-center rounded-full border border-slate-200">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="px-3 py-2 text-slate-500 hover:text-slate-900">
                              <Minus size={14} />
                            </button>
                            <span className="min-w-10 text-center text-sm font-semibold">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="px-3 py-2 text-slate-500 hover:text-slate-900">
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="font-semibold text-slate-900">{formatPrice(item.price * item.quantity, 'GBP')}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-200 px-6 py-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm text-slate-500">Subtotal</span>
              <span className="text-xl font-bold">{formatPrice(subtotal, 'GBP')}</span>
            </div>
            {checkoutError && <p className="mb-3 text-sm text-red-500">{checkoutError}</p>}
            <button onClick={closeCart} className="mb-3 w-full rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              Continue Shopping
            </button>
            <button
              onClick={() => { void checkout(); }}
              disabled={items.length === 0 || checkoutLoading || authLoading}
              className="w-full rounded-full bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {checkoutLoading ? 'Opening Checkout...' : authLoading ? 'Preparing Sign-In...' : 'Go to Checkout'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default CartDrawer;
