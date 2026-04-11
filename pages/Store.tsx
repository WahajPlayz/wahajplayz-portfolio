import React, { useMemo, useState } from 'react';
import { ShoppingBag, Package, Download, Lock, ExternalLink, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '@/context/StoreContext';
import { useCurrency } from '@/context/CurrencyContext';
import { isProductRestrictedInCountry } from '@/config/storeConfig';

const Store: React.FC = () => {
  const navigate = useNavigate();
  const { config } = useStore();
  const { formatPrice, userCountry } = useCurrency();
  const baseCurrency = 'GBP';

  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');

  const allCategories = Array.from(new Set(config.products.filter(p => p.enabled).map(p => p.category).filter(Boolean)));

  const products = useMemo(() => {
    let list = config.products.filter(p => p.enabled);
    if (filter === 'digital') list = list.filter(p => p.type === 'digital');
    else if (filter === 'physical') list = list.filter(p => p.type === 'physical');
    else if (filter !== 'all') list = list.filter(p => p.category === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q) || p.tags.some(t => t.toLowerCase().includes(q)));
    }
    if (sort === 'price-asc') list = [...list].sort((a, b) => a.price - b.price);
    else if (sort === 'price-desc') list = [...list].sort((a, b) => b.price - a.price);
    else list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
    return list;
  }, [config.products, filter, search, sort]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      <div className="relative pt-32 pb-16 overflow-hidden" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs mb-8"
          >
            <ArrowLeft size={14} /> Back to Home
          </button>
          <p className="font-mono text-xs tracking-widest mb-3" style={{ color: '#00d4ff' }}>// STORE</p>
          <h1 className="font-orbitron font-black text-4xl md:text-5xl text-white mb-4">{config.storePage.headline}</h1>
          <p className="text-gray-400 font-mono text-sm max-w-xl">{config.storePage.subheading}</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="rounded-xl border px-4 py-3 text-sm mb-6" style={{ borderColor: 'rgba(168,85,247,0.2)', background: 'rgba(168,85,247,0.06)', color: '#dfc4ff' }}>
          Select a product to view details, choose variants, and add it to your cart. Checkout is only available from the cart drawer.
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex flex-wrap gap-2 flex-1">
            {(['all', 'digital', 'physical', ...allCategories]).map(tab => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className="px-3 py-1.5 font-orbitron text-xs tracking-widest uppercase transition-all"
                style={filter === tab
                  ? { background: 'rgba(0,212,255,0.15)', border: '1px solid rgba(0,212,255,0.5)', color: '#00d4ff' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}
              >
                {tab}
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="pl-8 pr-4 py-2 bg-black/30 border border-white/10 text-white text-xs font-mono outline-none focus:border-cyan-500/50 w-40"
              />
            </div>
            <select
              value={sort}
              onChange={e => setSort(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              className="px-3 py-2 bg-black/30 border border-white/10 text-gray-400 text-xs font-mono outline-none focus:border-cyan-500/50"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price up</option>
              <option value="price-desc">Price down</option>
            </select>
          </div>
        </div>

        {products.length === 0 ? (
          <div className="text-center py-24">
            <ShoppingBag size={48} className="mx-auto mb-4 text-gray-700" />
            <p className="font-orbitron text-gray-600 text-sm">No products found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {products.map(product => {
              const isBlocked = isProductRestrictedInCountry(product, userCountry);
              const isOutOfStock = product.stock === 0;
              const isDigitalUnavailable = product.type === 'digital' && !product.digitalFileUrl;
              const salePercent = product.salePercent || 0;
              const effectivePrice = salePercent > 0 ? Math.round(product.price * (1 - salePercent / 100) * 100) / 100 : product.price;
              const price = formatPrice(effectivePrice, baseCurrency);
              const compareAt = salePercent > 0 ? formatPrice(product.price, baseCurrency) : null;
              return (
                <div
                  key={product.id}
                  className="group relative flex flex-col overflow-hidden transition-all hover:-translate-y-1"
                  style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)', opacity: isOutOfStock ? 0.6 : 1 }}
                >
                  <div className="relative h-48 bg-black/40 overflow-hidden">
                    {product.coverImage ? (
                      <img src={product.coverImage} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingBag size={36} className="text-gray-700" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 font-orbitron text-xs font-bold"
                        style={product.type === 'digital'
                          ? { background: 'rgba(168,85,247,0.85)', color: '#fff' }
                          : { background: 'rgba(0,212,255,0.85)', color: '#000' }}>
                        {product.type === 'digital' ? <Download size={10} /> : <Package size={10} />}
                        {product.type}
                      </span>
                    </div>
                    {compareAt && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 font-orbitron text-xs font-bold" style={{ background: 'rgba(239,68,68,0.9)', color: '#fff' }}>
                        -{salePercent}%
                      </div>
                    )}
                    {product.featured && !compareAt && (
                      <div className="absolute top-2 right-2 px-2 py-0.5 font-orbitron text-xs font-bold" style={{ background: 'rgba(234,179,8,0.85)', color: '#000' }}>
                        FEATURED
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {product.category && <span className="text-xs font-mono mb-1 text-gray-600">{product.category}</span>}
                    <p className="font-orbitron font-bold text-sm text-white mb-1 leading-tight">{product.name}</p>
                    <p className="text-gray-500 text-xs font-mono mb-3 line-clamp-2">{product.description}</p>

                    {product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {product.tags.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-xs font-mono rounded" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>#{tag}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="font-orbitron font-black text-xl" style={{ color: '#00d4ff' }}>{price}</span>
                        {compareAt && <span className="text-gray-600 text-sm line-through font-mono">{compareAt}</span>}
                      </div>

                      {isOutOfStock ? (
                        <div className="py-2.5 text-center text-xs font-orbitron font-bold" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#6b7280' }}>
                          Out of Stock
                        </div>
                      ) : isBlocked ? (
                        <div className="flex items-center gap-1.5 py-2.5 justify-center text-xs font-orbitron font-bold" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>
                          <Lock size={11} /> Not available in your region
                        </div>
                      ) : (
                        <button
                          onClick={() => navigate(`/store/${product.id}`)}
                          disabled={isDigitalUnavailable}
                          className="w-full py-2.5 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105 flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: product.type === 'digital' ? 'rgba(168,85,247,0.12)' : 'rgba(0,212,255,0.1)', border: product.type === 'digital' ? '1px solid rgba(168,85,247,0.45)' : '1px solid rgba(0,212,255,0.4)', color: product.type === 'digital' ? '#d8b4fe' : '#00d4ff', clipPath: 'polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 0 100%)' }}
                        >
                          <ExternalLink size={11} /> View Product
                        </button>
                      )}
                    </div>
                  </div>

                  {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                    <div className="px-4 pb-3 text-xs font-mono" style={{ color: '#f59e0b' }}>
                      Only {product.stock} left
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Store;
