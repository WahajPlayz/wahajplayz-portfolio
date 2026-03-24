import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowLeft, Minus, Plus, ShoppingBag, Star } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { StoreProduct } from '@/config/storeConfig';
import { useStore } from '@/context/StoreContext';
import { useCurrency } from '@/context/CurrencyContext';
import { useCart } from '@/context/CartContext';

type ProductReview = NonNullable<StoreProduct['reviews']>[number];
type ProductColor = NonNullable<StoreProduct['colorOptions']>[number];

const fallbackPalette = [
  { id: 'red-flare', label: 'Red Flare', hex: '#ef4444' },
  { id: 'carbon-black', label: 'Carbon Black', hex: '#111111' },
  { id: 'ice-white', label: 'Ice White', hex: '#f8fafc' },
  { id: 'electric-blue', label: 'Electric Blue', hex: '#2563eb' },
  { id: 'lime-burst', label: 'Lime Burst', hex: '#84cc16' },
];

const seededReviews = (product: StoreProduct): ProductReview[] => product.reviews?.length
  ? product.reviews
  : [
      { id: `${product.id}-review-1`, reviewer: 'Aaliyah', rating: 5, date: '2026-03-02', comment: 'Very clean finish and the colour looks better in person. I would order this again.' },
      { id: `${product.id}-review-2`, reviewer: 'Marcus', rating: 4, date: '2026-02-19', comment: 'Print quality was consistent across the full roll. Packaging and delivery were solid too.' },
      { id: `${product.id}-review-3`, reviewer: 'Rin', rating: 4, date: '2026-01-28', comment: 'Good value and easy to work with. I only wish there were even more colour choices.' },
    ];

const deriveProductView = (product: StoreProduct) => {
  const galleryImages = [product.coverImage, ...(product.galleryImages || [])].filter(Boolean);
  const colors = product.colorOptions?.length
    ? product.colorOptions
    : fallbackPalette.map((color, index) => ({
        ...color,
        imageUrl: index === 0 ? product.coverImage : galleryImages[index % Math.max(1, galleryImages.length)] || product.coverImage,
      }));
  return {
    galleryImages: galleryImages.length > 0 ? galleryImages : colors.map(color => color.imageUrl).filter(Boolean),
    features: product.features?.length ? product.features : [
      'Designed for clean, repeatable results',
      'Balanced for daily production use',
      'Reliable finish with minimal setup friction',
      'Built for makers who want consistent output',
    ],
    cautions: product.cautions?.length ? product.cautions : [
      'Store in a cool, dry environment',
      'Confirm printer compatibility before ordering',
      'Inspect your setup before long print runs',
    ],
    warningMessage: product.warningMessage || 'Check your machine settings and material profile before starting a long run.',
    colors,
    types: product.typeOptions?.length ? product.typeOptions : ['Refill', 'With Spool'],
    sizes: product.sizeOptions?.length ? product.sizeOptions : ['1kg', '2kg'],
    bulkDiscounts: product.bulkDiscounts?.length ? product.bulkDiscounts : [
      { label: '30% off 4+ items', minQuantity: 4, percentOff: 30 },
      { label: '40% off 6+ items', minQuantity: 6, percentOff: 40 },
    ],
  };
};

const renderStars = (rating: number) => (
  Array.from({ length: 5 }, (_, index) => (
    <Star
      key={index}
      size={16}
      className={index < Math.round(rating) ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}
    />
  ))
);

const StoreProductDetail: React.FC = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { config } = useStore();
  const { formatPrice } = useCurrency();
  const { addItem, openCart } = useCart();

  const product = config.products.find(item => item.id === productId && item.enabled) || null;
  const details = useMemo(() => product ? deriveProductView(product) : null, [product]);

  const [activeImage, setActiveImage] = useState('');
  const [selectedColorId, setSelectedColorId] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  useEffect(() => {
    if (!product || !details) return;
    setActiveImage(details.galleryImages[0] || product.coverImage || '');
    setSelectedColorId(details.colors[0]?.id || '');
    setSelectedType(details.types[0] || '');
    setSelectedSize(details.sizes[0] || '');
    setQuantity(1);
    setReviews(seededReviews(product));
  }, [product, details]);

  if (!product || !details) {
    return (
      <div className="min-h-screen bg-white px-6 py-24 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <button onClick={() => navigate('/store')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
            <ArrowLeft size={16} /> Back to Shop
          </button>
          <div className="mt-10 rounded-3xl border border-slate-200 p-10 text-center">
            <h1 className="text-3xl font-bold">Product not found</h1>
            <p className="mt-3 text-slate-500">This item is unavailable or no longer listed in the shop.</p>
          </div>
        </div>
      </div>
    );
  }

  const selectedColor = details.colors.find(color => color.id === selectedColorId) || details.colors[0];
  const availableStock = product.stock ?? 12;
  const maxQuantity = Math.max(1, availableStock);
  const stockState = availableStock <= 0
    ? { label: 'Out of Stock', className: 'bg-red-50 text-red-600' }
    : availableStock <= 5
      ? { label: `Low Stock (Only ${availableStock} left!)`, className: 'bg-orange-50 text-orange-600' }
      : { label: 'In Stock', className: 'bg-emerald-50 text-emerald-600' };

  const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / Math.max(1, reviews.length);
  const ratingBreakdown = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(review => review.rating === stars).length;
    return {
      stars,
      count,
      width: `${(count / Math.max(1, reviews.length)) * 100}%`,
    };
  });

  const onAddToCart = () => {
    if (availableStock <= 0 || !selectedColor) return;
    addItem({
      product,
      quantity,
      maxQuantity,
      image: selectedColor.imageUrl || activeImage,
      variant: {
        colorId: selectedColor.id,
        colorLabel: selectedColor.label,
        type: selectedType,
        size: selectedSize,
      },
    });
  };

  const submitReview = (event: React.FormEvent) => {
    event.preventDefault();
    if (!reviewName.trim() || !reviewComment.trim()) return;
    setReviews(current => [
      {
        id: `${product.id}-review-${Date.now()}`,
        reviewer: reviewName.trim(),
        rating: reviewRating,
        date: new Date().toISOString().slice(0, 10),
        comment: reviewComment.trim(),
      },
      ...current,
    ]);
    setReviewName('');
    setReviewRating(5);
    setReviewComment('');
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <div className="mx-auto max-w-7xl px-6 py-10 md:py-14">
        <div className="mb-8 flex items-center justify-between gap-4">
          <button onClick={() => navigate('/store')} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
            <ArrowLeft size={16} /> Back to Shop
          </button>
          <button onClick={openCart} className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
            <ShoppingBag size={16} /> View Cart
          </button>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
          <div>
            <div className="overflow-hidden rounded-[2rem] bg-slate-100">
              {activeImage ? (
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex min-h-[420px] items-center justify-center text-slate-300">
                  <ShoppingBag size={40} />
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {details.galleryImages.map(image => (
                <button
                  key={image}
                  onClick={() => setActiveImage(image)}
                  className={`h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 transition-colors ${activeImage === image ? 'border-slate-900' : 'border-slate-200'}`}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">{product.category || 'Product'}</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-950">{product.name}</h1>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <div className="text-3xl font-bold text-slate-950">{formatPrice(product.price, 'GBP')}</div>
              {product.compareAtPrice > 0 && (
                <div className="text-lg text-slate-400 line-through">{formatPrice(product.compareAtPrice, 'GBP')}</div>
              )}
              <div className={`rounded-full px-3 py-1 text-sm font-semibold ${stockState.className}`}>{stockState.label}</div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {details.bulkDiscounts.map(discount => (
                <span key={discount.label} className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600">
                  {discount.label}
                </span>
              ))}
            </div>

            <div className="mt-8 grid gap-8 border-y border-slate-200 py-8">
              <div>
                <h2 className="text-xl font-semibold">Product Features</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {details.features.map(feature => <li key={feature}>{feature}</li>)}
                </ul>
              </div>

              <div>
                <h2 className="text-xl font-semibold">Cautions / Notes</h2>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
                  {details.cautions.map(note => <li key={note}>{note}</li>)}
                </ul>
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
                    <p>{details.warningMessage}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-500">Colour</p>
              <p className="mt-2 text-lg font-semibold">{selectedColor?.label || 'Select a colour'}</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {details.colors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => {
                      setSelectedColorId(color.id);
                      if (color.imageUrl) setActiveImage(color.imageUrl);
                    }}
                    className={`h-11 w-11 rounded-full border-2 p-1 transition-transform hover:scale-105 ${selectedColor?.id === color.id ? 'border-slate-900' : 'border-slate-200'}`}
                    aria-label={color.label}
                  >
                    <span className="block h-full w-full rounded-full border border-white" style={{ backgroundColor: color.hex }} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-500">Type</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {details.types.map(option => (
                  <button
                    key={option}
                    onClick={() => setSelectedType(option)}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${selectedType === option ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-500">Size</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {details.sizes.map(option => (
                  <button
                    key={option}
                    onClick={() => setSelectedSize(option)}
                    className={`rounded-full px-5 py-3 text-sm font-semibold transition-colors ${selectedSize === option ? 'bg-slate-900 text-white' : 'border border-slate-200 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-8">
              <p className="text-sm font-semibold text-slate-500">Quantity</p>
              <div className="mt-3 flex items-center gap-4">
                <div className="flex items-center rounded-full border border-slate-200">
                  <button onClick={() => setQuantity(current => Math.max(1, current - 1))} className="px-4 py-3 text-slate-500 hover:text-slate-900">
                    <Minus size={16} />
                  </button>
                  <input
                    value={quantity}
                    onChange={event => {
                      const nextValue = Number(event.target.value.replace(/\D/g, '')) || 1;
                      setQuantity(Math.max(1, Math.min(maxQuantity, nextValue)));
                    }}
                    className="w-14 border-none text-center text-base font-semibold outline-none"
                  />
                  <button onClick={() => setQuantity(current => Math.min(maxQuantity, current + 1))} className="px-4 py-3 text-slate-500 hover:text-slate-900">
                    <Plus size={16} />
                  </button>
                </div>
                <p className="text-sm text-slate-500">Max {maxQuantity}</p>
              </div>
            </div>

            <button
              onClick={onAddToCart}
              disabled={availableStock <= 0}
              className="mt-10 w-full rounded-full bg-slate-900 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Add to Cart
            </button>
          </div>
        </div>

        <section className="mt-20 border-t border-slate-200 pt-14">
          <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-400">Reviews & Ratings</p>
              <div className="mt-5 flex items-end gap-4">
                <div className="text-5xl font-bold tracking-tight">{averageRating.toFixed(1)}</div>
                <div>
                  <div className="flex items-center gap-1">{renderStars(averageRating)}</div>
                  <p className="mt-2 text-sm text-slate-500">Based on {reviews.length} reviews</p>
                </div>
              </div>

              <div className="mt-8 space-y-3">
                {ratingBreakdown.map(item => (
                  <div key={item.stars} className="flex items-center gap-4">
                    <span className="w-10 text-sm font-medium text-slate-500">{item.stars} star</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-amber-400" style={{ width: item.width }} />
                    </div>
                    <span className="w-8 text-right text-sm text-slate-500">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-8">
              <div className="space-y-5">
                {reviews.map(review => (
                  <article key={review.id} className="rounded-3xl border border-slate-200 p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-slate-950">{review.reviewer}</h3>
                        <p className="mt-1 text-sm text-slate-500">{new Date(review.date).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-1">{renderStars(review.rating)}</div>
                    </div>
                    <p className="mt-4 text-sm leading-6 text-slate-600">{review.comment}</p>
                  </article>
                ))}
              </div>

              <form onSubmit={submitReview} className="rounded-3xl border border-slate-200 p-6">
                <h3 className="text-xl font-semibold">Leave a Review</h3>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <input
                    value={reviewName}
                    onChange={event => setReviewName(event.target.value)}
                    placeholder="Your name"
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-slate-900"
                  />
                  <select
                    value={reviewRating}
                    onChange={event => setReviewRating(Number(event.target.value))}
                    className="rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-slate-900"
                  >
                    {[5, 4, 3, 2, 1].map(value => <option key={value} value={value}>{value} Stars</option>)}
                  </select>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={event => setReviewComment(event.target.value)}
                  placeholder="What did you think?"
                  rows={5}
                  className="mt-4 w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition-colors focus:border-slate-900"
                />
                <button type="submit" className="mt-4 rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-700">
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
