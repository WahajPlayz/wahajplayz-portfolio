import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Minus, Plus, ShoppingBag, Star, Download, Package } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { isProductRestrictedInCountry, StoreProduct } from '@/config/storeConfig';
import { useStore } from '@/context/StoreContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useCart } from '@/context/CartContext';

type ProductReview = NonNullable<StoreProduct['reviews']>[number];

const renderStars = (rating: number, interactive?: { onChange: (v: number) => void }) =>
  Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      size={16}
      onClick={() => interactive?.onChange(i + 1)}
      className={`${i < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-600'} ${interactive ? 'cursor-pointer hover:text-amber-400' : ''}`}
    />
  ));

const StoreProductDetail: React.FC = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { config } = useStore();
  const { formatPrice, userCountry } = useCurrency();
  const { addItem, openCart } = useCart();

  const product = config.products.find(p => p.id === productId && p.enabled) || null;

  const galleryImages = useMemo(() => {
    if (!product) return [];
    return [product.coverImage, ...(product.galleryImages || [])].filter(Boolean);
  }, [product]);

  const [activeImage, setActiveImage] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [addedFeedback, setAddedFeedback] = useState(false);

  useEffect(() => {
    if (!product) return;
    setActiveImage(galleryImages[0] || '');
    setSelectedColorId(product.colorOptions?.[0]?.id || '');
    setSelectedType(product.typeOptions?.[0] || '');
    setSelectedSize(product.sizeOptions?.[0] || '');
    setQuantity(1);
    setCustomAnswers({});
    setReviews(product.reviews || []);
  }, [product, galleryImages]);

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d0e12' }}>
        <div className="text-center">
          <ShoppingBag size={48} className="mx-auto mb-4 text-gray-700" />
          <h1 className="font-orbitron font-bold text-xl text-white mb-2">Product not found</h1>
          <p className="text-gray-500 font-mono text-sm mb-6">This item is unavailable or no longer listed.</p>
          <button onClick={() => navigate('/store')} className="font-orbitron text-xs tracking-widest uppercase px-6 py-3 transition-all hover:scale-105"
            style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff' }}>
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const availableStock = product.stock ?? Infinity;
  const maxQuantity = availableStock === Infinity ? 99 : Math.max(1, availableStock);
  const isOutOfStock = product.stock === 0;
  const salePercent = product.salePercent || 0;
  const effectivePrice = salePercent > 0 ? Math.round(product.price * (1 - salePercent / 100) * 100) / 100 : product.price;
  const selectedColor = product.colorOptions?.find(c => c.id === selectedColorId) || null;
  const isBlockedInRegion = isProductRestrictedInCountry(product, userCountry);

  const hasColors = (product.colorOptions?.length || 0) > 0;
  const hasTypes = (product.typeOptions?.length || 0) > 0;
  const hasSizes = (product.sizeOptions?.length || 0) > 0;
  const hasCustomFields = (product.customFields?.length || 0) > 0;
  const hasBulkDiscounts = (product.bulkDiscounts?.length || 0) > 0;

  const missingRequired = product.customFields?.filter(f => f.required && !customAnswers[f.label]?.trim()) || [];
  const canAdd = !isOutOfStock && !isBlockedInRegion && missingRequired.length === 0;

  const averageRating = reviews.length > 0
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const onAddToCart = () => {
    if (!canAdd) return;
    addItem({
      product,
      quantity,
      maxQuantity,
      effectivePrice,
      image: (selectedColor?.imageUrl || activeImage) || '',
      variant: {
        colorId: selectedColor?.id || '',
        colorLabel: selectedColor?.label || '',
        type: selectedType,
        size: selectedSize,
        customAnswers: hasCustomFields ? Object.fromEntries(Object.entries(customAnswers).filter(([,v]) => v)) : undefined,
      },
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const submitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setReviews(cur => [{
      id: `${product.id}-${Date.now()}`,
      reviewer: reviewName.trim(),
      rating: reviewRating,
      date: new Date().toISOString().slice(0, 10),
      comment: reviewComment.trim(),
    }, ...cur]);
    setReviewName(''); setReviewRating(5); setReviewComment('');
  };

  const inputClass = "w-full px-4 py-3 font-mono text-sm text-white outline-none focus:border-cyan-500/60 transition-colors"
    + " bg-black/40 border border-white/10";

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: '#0d0e12' }}>
      {/* Header */}
      <div className="relative pt-28 pb-8 overflow-hidden" style={{ borderBottom: '1px solid rgba(0,212,255,0.1)' }}>
        <div className="absolute inset-0 grid-bg opacity-10 pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 relative z-10 flex items-center justify-between">
          <button onClick={() => navigate('/store')} className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors font-mono text-xs">
            <ArrowLeft size={14} /> Back to Shop
          </button>
          <button onClick={openCart} className="flex items-center gap-2 font-mono text-xs transition-colors hover:text-cyan-300" style={{ color: '#00d4ff' }}>
            <ShoppingBag size={14} /> View Cart
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Main grid */}
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:items-start">

          {/* Left — gallery */}
          <div>
            <div className="overflow-hidden" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', clipPath: 'polygon(0 0, calc(100% - 20px) 0, 100% 20px, 100% 100%, 0 100%)' }}>
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="w-full object-cover" style={{ maxHeight: 480 }} />
              ) : (
                <div className="flex items-center justify-center text-gray-700" style={{ minHeight: 380 }}>
                  <ShoppingBag size={48} />
                </div>
              )}
            </div>
            {galleryImages.length > 1 && (
              <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                {galleryImages.map(img => (
                  <button key={img} onClick={() => setActiveImage(img)}
                    className="flex-shrink-0 h-16 w-16 overflow-hidden transition-all"
                    style={{ border: activeImage === img ? '2px solid #00d4ff' : '2px solid rgba(255,255,255,0.08)', opacity: activeImage === img ? 1 : 0.6 }}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right — product info */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="flex items-center gap-1 px-2 py-0.5 font-orbitron text-xs font-bold"
                style={product.type === 'digital'
                  ? { background: 'rgba(168,85,247,0.2)', border: '1px solid rgba(168,85,247,0.4)', color: '#d8b4fe' }
                  : { background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}>
                {product.type === 'digital' ? <Download size={10} /> : <Package size={10} />} {product.type}
              </span>
              {product.category && <span className="font-mono text-xs text-gray-600">{product.category}</span>}
            </div>

            <h1 className="font-orbitron font-black text-3xl md:text-4xl text-white mb-4">{product.name}</h1>

            {/* Price */}
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="font-orbitron font-black text-3xl" style={{ color: '#00d4ff' }}>{formatPrice(effectivePrice, 'GBP')}</span>
              {salePercent > 0 && (
                <>
                  <span className="text-gray-500 text-lg line-through font-mono">{formatPrice(product.price, 'GBP')}</span>
                  <span className="font-orbitron font-bold text-sm px-2 py-0.5" style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#f87171' }}>{salePercent}% OFF</span>
                </>
              )}
              {isOutOfStock ? (
                <span className="font-mono text-xs px-3 py-1" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>Out of Stock</span>
              ) : isBlockedInRegion ? (
                <span className="font-mono text-xs px-3 py-1" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}>Not available in your region</span>
              ) : product.stock !== null && product.stock <= 5 ? (
                <span className="font-mono text-xs px-3 py-1" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}>Only {product.stock} left</span>
              ) : (
                <span className="font-mono text-xs px-3 py-1" style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>In Stock</span>
              )}
            </div>

            {/* Bulk discounts */}
            {hasBulkDiscounts && (
              <div className="flex flex-wrap gap-2 mb-6">
                {product.bulkDiscounts!.map(d => (
                  <span key={d.label} className="font-mono text-xs px-3 py-1" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', color: '#fbbf24' }}>{d.label}</span>
                ))}
              </div>
            )}

            {/* Description */}
            {product.description && (
              <p className="text-gray-400 font-mono text-sm leading-relaxed mb-6">{product.description}</p>
            )}

            {/* Features */}
            {(product.features?.length || 0) > 0 && (
              <div className="mb-6 p-4" style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.12)' }}>
                <p className="font-orbitron font-bold text-xs tracking-widest text-cyan-400 mb-3">FEATURES</p>
                <ul className="space-y-1.5">
                  {product.features!.map(f => (
                    <li key={f} className="flex items-start gap-2 font-mono text-xs text-gray-400">
                      <span style={{ color: '#00d4ff' }}>›</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Cautions */}
            {(product.cautions?.length || 0) > 0 && (
              <div className="mb-6 p-4" style={{ background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} style={{ color: '#fbbf24' }} />
                  <p className="font-orbitron font-bold text-xs tracking-widest" style={{ color: '#fbbf24' }}>CAUTIONS</p>
                </div>
                <ul className="space-y-1">
                  {product.cautions!.map(c => <li key={c} className="font-mono text-xs text-gray-500">{c}</li>)}
                </ul>
                {product.warningMessage && <p className="mt-3 font-mono text-xs" style={{ color: '#f59e0b' }}>{product.warningMessage}</p>}
              </div>
            )}

            {/* Divider */}
            <div className="my-6" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }} />

            {/* Color variant */}
            {hasColors && (
              <div className="mb-6">
                <p className="font-orbitron font-bold text-xs tracking-widest text-gray-400 mb-1">COLOUR</p>
                {selectedColor && <p className="font-mono text-sm text-white mb-3">{selectedColor.label}</p>}
                <div className="flex flex-wrap gap-3">
                  {product.colorOptions!.map(c => (
                    <button key={c.id} onClick={() => { setSelectedColorId(c.id); if (c.imageUrl) setActiveImage(c.imageUrl); }}
                      className="h-10 w-10 rounded-full p-1 transition-transform hover:scale-110"
                      style={{ border: selectedColorId === c.id ? '2px solid #00d4ff' : '2px solid rgba(255,255,255,0.15)' }}
                      title={c.label}>
                      <span className="block w-full h-full rounded-full" style={{ backgroundColor: c.hex }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Type variant */}
            {hasTypes && (
              <div className="mb-6">
                <p className="font-orbitron font-bold text-xs tracking-widest text-gray-400 mb-3">TYPE</p>
                <div className="flex flex-wrap gap-2">
                  {product.typeOptions!.map(opt => (
                    <button key={opt} onClick={() => setSelectedType(opt)}
                      className="px-5 py-2 font-orbitron text-xs font-bold tracking-wider transition-all"
                      style={selectedType === opt
                        ? { background: 'rgba(0,212,255,0.15)', border: '1px solid #00d4ff', color: '#00d4ff' }
                        : { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Size variant */}
            {hasSizes && (
              <div className="mb-6">
                <p className="font-orbitron font-bold text-xs tracking-widest text-gray-400 mb-3">SIZE</p>
                <div className="flex flex-wrap gap-2">
                  {product.sizeOptions!.map(opt => (
                    <button key={opt} onClick={() => setSelectedSize(opt)}
                      className="px-5 py-2 font-orbitron text-xs font-bold tracking-wider transition-all"
                      style={selectedSize === opt
                        ? { background: 'rgba(0,212,255,0.15)', border: '1px solid #00d4ff', color: '#00d4ff' }
                        : { background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#9ca3af' }}>
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom fields (Etsy-style personalization) */}
            {hasCustomFields && (
              <div className="mb-6 p-4" style={{ background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <p className="font-orbitron font-bold text-xs tracking-widest mb-4" style={{ color: '#d8b4fe' }}>PERSONALIZATION</p>
                <div className="space-y-4">
                  {product.customFields!.map(field => (
                    <div key={field.id}>
                      <label className="block font-mono text-xs text-gray-400 mb-1.5">
                        {field.label}{field.required && <span style={{ color: '#f87171' }}> *</span>}
                      </label>
                      {field.type === 'color-picker' && field.colorSwatches?.length ? (
                        <div className="flex flex-wrap gap-3">
                          {field.colorSwatches.map(swatch => {
                            const selected = customAnswers[field.label] === swatch.name;
                            return (
                              <button key={swatch.name} onClick={() => setCustomAnswers(a => ({ ...a, [field.label]: swatch.name }))}
                                className="flex flex-col items-center gap-1.5 group">
                                <span className="w-10 h-10 rounded-full transition-transform group-hover:scale-110"
                                  style={{ backgroundColor: swatch.hex, border: selected ? '3px solid #00d4ff' : '2px solid rgba(255,255,255,0.2)', boxShadow: selected ? '0 0 0 2px rgba(0,212,255,0.3)' : 'none' }} />
                                <span className="font-mono text-[10px]" style={{ color: selected ? '#00d4ff' : '#6b7280' }}>{swatch.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : field.type === 'color-picker' ? (
                        <p className="font-mono text-xs text-gray-600">No colours added yet by the shop owner.</p>
                      ) : field.type === 'select' && field.options?.length ? (
                        <select value={customAnswers[field.label] || ''} onChange={e => setCustomAnswers(a => ({ ...a, [field.label]: e.target.value }))}
                          className={inputClass} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <option value="">Select an option...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <input value={customAnswers[field.label] || ''} onChange={e => setCustomAnswers(a => ({ ...a, [field.label]: e.target.value }))}
                          placeholder={field.placeholder || ''}
                          className={inputClass} style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity */}
            <div className="mb-8">
              <p className="font-orbitron font-bold text-xs tracking-widest text-gray-400 mb-3">QUANTITY</p>
              <div className="flex items-center gap-4">
                <div className="flex items-center" style={{ border: '1px solid rgba(255,255,255,0.12)' }}>
                  <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="px-4 py-3 text-gray-500 hover:text-white transition-colors">
                    <Minus size={14} />
                  </button>
                  <input value={quantity}
                    onChange={e => setQuantity(Math.max(1, Math.min(maxQuantity, Number(e.target.value.replace(/\D/g, '')) || 1)))}
                    className="w-12 text-center bg-transparent text-white font-orbitron font-bold text-sm outline-none" />
                  <button onClick={() => setQuantity(q => Math.min(maxQuantity, q + 1))} className="px-4 py-3 text-gray-500 hover:text-white transition-colors">
                    <Plus size={14} />
                  </button>
                </div>
                {product.stock !== null && <p className="font-mono text-xs text-gray-600">Max {maxQuantity}</p>}
              </div>
            </div>

            {/* Missing required fields warning */}
            {missingRequired.length > 0 && (
              <p className="font-mono text-xs mb-3" style={{ color: '#f87171' }}>
                Please fill in: {missingRequired.map(f => f.label).join(', ')}
              </p>
            )}
            {isBlockedInRegion && (
              <p className="font-mono text-xs mb-3" style={{ color: '#f87171' }}>
                This physical item is not available for shipping to your region.
              </p>
            )}

            {/* Add to Cart */}
            <button onClick={onAddToCart} disabled={!canAdd}
              className="w-full py-4 font-orbitron font-bold text-sm tracking-widest uppercase transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              style={{
                background: addedFeedback ? 'rgba(34,197,94,0.15)' : 'rgba(0,212,255,0.12)',
                border: addedFeedback ? '1px solid rgba(34,197,94,0.5)' : '1px solid rgba(0,212,255,0.4)',
                color: addedFeedback ? '#4ade80' : '#00d4ff',
                clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 0 100%)',
              }}>
              {isOutOfStock ? 'Out of Stock' : isBlockedInRegion ? 'Not Available In Your Region' : addedFeedback ? 'Added to Cart!' : 'Add to Cart'}
            </button>
          </div>
        </div>

        {/* Reviews */}
        <section className="mt-20 pt-12" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <p className="font-mono text-xs tracking-widest mb-2" style={{ color: '#00d4ff' }}>// REVIEWS</p>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr]">
            {/* Rating summary */}
            <div>
              {reviews.length > 0 ? (
                <>
                  <div className="flex items-end gap-4 mb-6">
                    <span className="font-orbitron font-black text-5xl text-white">{averageRating.toFixed(1)}</span>
                    <div>
                      <div className="flex gap-0.5 mb-1">{renderStars(averageRating)}</div>
                      <p className="font-mono text-xs text-gray-600">{reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[5,4,3,2,1].map(stars => {
                      const count = reviews.filter(r => r.rating === stars).length;
                      return (
                        <div key={stars} className="flex items-center gap-3">
                          <span className="font-mono text-xs text-gray-600 w-10">{stars} star</span>
                          <div className="flex-1 h-1.5 overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full" style={{ width: `${(count / reviews.length) * 100}%`, background: '#fbbf24' }} />
                          </div>
                          <span className="font-mono text-xs text-gray-600 w-4 text-right">{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="font-mono text-sm text-gray-600">No reviews yet. Be the first!</p>
              )}
            </div>

            {/* Review list + form */}
            <div className="space-y-6">
              {reviews.map(r => (
                <article key={r.id} className="p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="font-orbitron font-bold text-sm text-white">{r.reviewer}</p>
                      <p className="font-mono text-xs text-gray-600 mt-0.5">{new Date(r.date).toLocaleDateString()}</p>
                    </div>
                    <div className="flex gap-0.5">{renderStars(r.rating)}</div>
                  </div>
                  <p className="font-mono text-xs text-gray-400 leading-relaxed">{r.comment}</p>
                </article>
              ))}

              <form onSubmit={submitReview} className="p-5" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="font-orbitron font-bold text-sm text-white mb-4">Leave a Review</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <input value={reviewName} onChange={e => setReviewName(e.target.value)} placeholder="Your name"
                    className={inputClass} style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                  <div className="flex items-center gap-1 px-3" style={{ border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.4)' }}>
                    {renderStars(reviewRating, { onChange: setReviewRating })}
                  </div>
                </div>
                <textarea value={reviewComment} onChange={e => setReviewComment(e.target.value)} placeholder="What did you think?" rows={4}
                  className={inputClass + ' resize-none'} style={{ border: '1px solid rgba(255,255,255,0.1)' }} />
                <button type="submit" className="mt-3 px-6 py-2.5 font-orbitron font-bold text-xs tracking-widest uppercase transition-all hover:scale-105"
                  style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.35)', color: '#00d4ff' }}>
                  Submit Review
                </button>
              </form>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default StoreProductDetail;
