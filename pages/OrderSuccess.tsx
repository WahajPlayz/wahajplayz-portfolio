import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, MapPin, Package, ShoppingBag } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { fetchOrderSummary } from '@/lib/stripeCheckout';
import { useCurrency } from '@/context/CurrencyContext';

type OrderSummary = Awaited<ReturnType<typeof fetchOrderSummary>>;

const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', GB: 'United Kingdom', CA: 'Canada', AU: 'Australia',
  DE: 'Germany', FR: 'France', JP: 'Japan', IN: 'India', BR: 'Brazil',
};

const formatAmount = (amountMinor: number, currency: string) => {
  const amount = amountMinor / 100;
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
};

const OrderSuccessPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const sessionId = params.get('session_id');

  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!sessionId) {
      setError('No order session found.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        const summary = await fetchOrderSummary(sessionId);
        if (!cancelled) {
          setOrder(summary);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not load order details.');
          setLoading(false);
        }
      }
    };

    void load();
    return () => { cancelled = true; };
  }, [sessionId]);

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center gap-4 py-8">
          <div className="w-10 h-10 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <p className="font-orbitron text-sm tracking-widest uppercase text-gray-400">Confirming your order...</p>
        </div>
      );
    }

    if (error || !order) {
      return (
        <>
          <p className="font-orbitron text-sm tracking-widest uppercase mb-3" style={{ color: '#a855f7' }}>Order Confirmation</p>
          <h1 className="font-orbitron font-black text-2xl mb-3 text-white">Something went wrong</h1>
          <p className="text-gray-400 text-sm mb-6">
            {error || 'Could not load order details.'} Check your email for a payment confirmation.
          </p>
          <button
            onClick={() => navigate('/store')}
            className="inline-flex items-center gap-2 px-5 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#67e8f9', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
          >
            <ShoppingBag size={14} /> Back to Store
          </button>
        </>
      );
    }

    const addr = order.shippingAddress;
    const shortId = order.orderId.slice(-8).toUpperCase();
    const countryLabel = addr?.country ? (COUNTRY_NAMES[addr.country] || addr.country) : '';

    return (
      <>
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 flex-shrink-0">
            <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400/10" />
            <Check size={30} className="relative text-emerald-400" />
          </div>
          <div>
            <p className="font-orbitron text-sm tracking-widest uppercase mb-1" style={{ color: '#00d4ff' }}>Payment Complete</p>
            <h1 className="font-orbitron font-black text-2xl text-white">Thank You!</h1>
          </div>
        </div>

        <p className="text-gray-400 text-sm mb-6">
          Your order has been confirmed. We'll get it packed and shipped as soon as possible.
        </p>

        {/* Order ID + amount */}
        <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <div>
            <p className="font-mono text-[10px] text-gray-500 mb-0.5">Order</p>
            <p className="font-orbitron font-bold text-xs text-white tracking-wider">#{shortId}</p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] text-gray-500 mb-0.5">Total</p>
            <p className="font-orbitron font-bold text-sm text-white">{formatAmount(order.amountTotal, order.currency)}</p>
          </div>
        </div>

        {/* Products */}
        <div className="rounded-xl mb-4 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
            <Package size={13} className="text-gray-500" />
            <p className="font-orbitron font-bold text-xs text-gray-400 tracking-widest uppercase">Items Ordered</p>
          </div>
          {order.products.map((product, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-3" style={{ borderBottom: i < order.products.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              <div>
                <p className="font-mono text-sm text-white">{product.name}</p>
                {product.variant && <p className="font-mono text-xs text-gray-500 mt-0.5">{product.variant}</p>}
              </div>
              <p className="font-orbitron text-xs text-gray-400">× {product.quantity}</p>
            </div>
          ))}
        </div>

        {/* Shipping address */}
        {addr && (
          <div className="rounded-xl mb-6 overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-2 px-4 py-2.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(0,0,0,0.3)' }}>
              <MapPin size={13} className="text-gray-500" />
              <p className="font-orbitron font-bold text-xs text-gray-400 tracking-widest uppercase">Shipping To</p>
            </div>
            <div className="px-4 py-3">
              {order.shippingName && <p className="font-mono text-sm text-white mb-1">{order.shippingName}</p>}
              <p className="font-mono text-xs text-gray-400 leading-relaxed">
                {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                {addr.city}{addr.state ? `, ${addr.state}` : ''} {addr.postalCode}<br />
                {countryLabel}
              </p>
            </div>
          </div>
        )}

        <p className="text-gray-500 text-xs mb-6">
          A confirmation has been sent to <span className="text-gray-300">{order.customerEmail}</span>. You'll receive a shipping notification once your order is on its way.
        </p>

        <button
          onClick={() => navigate('/store')}
          className="inline-flex items-center gap-2 px-5 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
          style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#67e8f9', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
        >
          <ShoppingBag size={14} /> Back to Store
        </button>
      </>
    );
  };

  return (
    <div className="min-h-screen text-white flex items-center justify-center px-6 py-12" style={{ backgroundColor: '#0d0e12' }}>
      <div className="w-full max-w-xl rounded-2xl border p-8" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(0,212,255,0.15)' }}>
        <button
          onClick={() => navigate('/store')}
          className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs mb-8"
        >
          <ArrowLeft size={14} /> Back to Store
        </button>
        {renderBody()}
      </div>
    </div>
  );
};

export default OrderSuccessPage;
