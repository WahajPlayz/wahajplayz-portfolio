import React from 'react';
import { ShoppingBag, Package, Download, Lock, ExternalLink } from 'lucide-react';
import { useStore } from '@/context/StoreContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useNavigate } from 'react-router-dom';

const StoreFront: React.FC = () => {
  const { config } = useStore();
  const { formatPrice, userCountry } = useCurrency();
  const navigate = useNavigate();
  const baseCurrency = 'GBP';

  if (!config.enabled) return null;

  const featured = config.products.filter(p => p.enabled && p.featured).slice(0, 4);
  if (featured.length === 0) return null;

  return (
    <section id="store-preview" className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <p className="font-mono text-xs tracking-widest mb-4" style={{ color: '#00d4ff' }}>// STORE</p>
        <div className="flex items-end justify-between mb-12">
          <div>
            <h2 className="font-orbitron font-black text-3xl md:text-4xl text-white mb-3">{config.heading}</h2>
            <p className="text-gray-400 font-mono text-sm">{config.subheading}</p>
          </div>
          <button
            onClick={() => { window.location.hash = '#/store'; }}
            className="hidden md:flex items-center gap-2 px-5 py-2.5 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
          >
            <ShoppingBag size={14} />
            View All
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {featured.map(product => {
            const isBlocked = product.type === 'physical' && userCountry && product.blockedCountries.includes(userCountry);
            const price = formatPrice(product.price, baseCurrency);
            const compareAt = product.compareAtPrice > 0 ? formatPrice(product.compareAtPrice, baseCurrency) : null;
            return (
              <div
                key={product.id}
                className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-1"
                style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)' }}
              >
                <div className="relative h-44 bg-black/40 overflow-hidden">
                  {product.coverImage ? (
                    <img src={product.coverImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag size={32} className="text-gray-700" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <span className="flex items-center gap-1 px-2 py-0.5 font-orbitron text-xs font-bold"
                      style={product.type === 'digital'
                        ? { background: 'rgba(168,85,247,0.8)', color: '#fff' }
                        : { background: 'rgba(0,212,255,0.8)', color: '#000' }}>
                      {product.type === 'digital' ? <Download size={10} /> : <Package size={10} />}
                      {product.type}
                    </span>
                  </div>
                  {compareAt && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 font-orbitron text-xs font-bold" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                      SALE
                    </div>
                  )}
                </div>

                <div className="p-4 flex flex-col flex-1">
                  {product.category && (
                    <span className="text-xs font-mono mb-1" style={{ color: '#6b7280' }}>{product.category}</span>
                  )}
                  <p className="font-orbitron font-bold text-sm text-white mb-1 leading-tight">{product.name}</p>
                  <p className="text-gray-500 text-xs font-mono mb-3 line-clamp-2">{product.description}</p>

                  <div className="mt-auto">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-orbitron font-black text-lg" style={{ color: '#00d4ff' }}>{price}</span>
                      {compareAt && <span className="text-gray-600 text-xs line-through font-mono">{compareAt}</span>}
                    </div>

                    {isBlocked ? (
                      <div className="flex items-center gap-1.5 py-2 justify-center text-xs font-orbitron font-bold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                        <Lock size={11} /> Not available in your region
                      </div>
                    ) : (
                      <button
                        onClick={() => navigate(`/store/${product.id}`)}
                        className="w-full py-2.5 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105 flex items-center justify-center gap-1.5"
                        style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                      >
                        <ExternalLink size={11} /> View Product
                      </button>
                    )}
                  </div>
                </div>

                {product.stock !== null && product.stock <= 5 && product.stock > 0 && (
                  <div className="px-4 pb-3 text-xs font-mono" style={{ color: '#f59e0b' }}>
                    Only {product.stock} left in stock
                  </div>
                )}
                {product.stock === 0 && (
                  <div className="px-4 pb-3 text-xs font-mono" style={{ color: '#ef4444' }}>Out of stock</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 flex justify-center md:hidden">
          <button
            onClick={() => { window.location.hash = '#/store'; }}
            className="flex items-center gap-2 px-6 py-3 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)', color: '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)' }}
          >
            <ShoppingBag size={14} /> View All Products
          </button>
        </div>
      </div>
    </section>
  );
};

export default StoreFront;
