import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Minus, Plus, ShoppingBag, MessageCircle } from 'lucide-react';
import { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { Link } from '../lib/router.tsx';
import { trackEvent } from '../lib/tracker.ts';
import { trackMetaEvent } from '../lib/metaPixel.ts';
import { ImageWithFallback } from '../components/ImageWithFallback.tsx';

export function ProductDetailPage({ slug }: { slug: string }) {
  const { storefront, currency, formatMoney, getEffectivePrice, addToCart, setCartOpen } = useStore();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedVariantId, setSelectedVariantId] = useState<number>(0);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(slug)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Not found'))))
      .then((data) => {
        if (!active) return;
        const prod = data.product as Product;
        setProduct(prod);
        const firstPriced = prod.variants?.find((v) => v.price !== null) || prod.variants?.[0];
        setSelectedVariantId(firstPriced?.id || 0);
        setActiveImageIdx(0);
        setQuantity(1);
        if (prod.seo_title || prod.name) {
          document.title = prod.seo_title || `${prod.name} | Zobowellness`;
        }
        trackEvent({
          eventType: 'page_view',
          pagePath: `/product/${prod.slug}`,
          productName: prod.name,
        });
        const firstPrice = firstPriced ? getEffectivePrice(firstPriced) : null;
        trackMetaEvent('ViewContent', {
          content_name: prod.name,
          content_ids: [String(prod.id)],
          content_category: prod.category_name,
          content_type: 'product',
          currency,
          value: firstPrice !== null ? firstPrice : undefined,
        });
      })
      .catch(() => {
        if (active) setProduct(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug, currency, getEffectivePrice]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="h-96 bg-white rounded-2xl border border-[#E5DDD0] animate-pulse" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#640B1A]">Product Not Found</h1>
        <p className="text-sm text-[#5A504A]">This item may have been moved or hidden from the catalogue.</p>
        <Link to="/shop" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Shop</span>
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : [{ id: 0, product_id: product.id, image_url: '/assets/botanical/hero-hibiscus.jpg', alt_text: product.name, is_primary: 1, sort_order: 0 }];
  const variants = product.variants || [];
  const activeVariant = variants.find((v) => v.id === selectedVariantId) || variants[0];
  const effectivePrice = activeVariant ? getEffectivePrice(activeVariant) : null;
  const hasPromo =
    activeVariant &&
    activeVariant.promo_price !== null &&
    activeVariant.promo_price !== undefined &&
    activeVariant.price !== null;
  const available = product.is_available === 1 && product.stock_quantity > 0;
  const isHibiscus = product.category_slug === 'hibiscus-leaves' || product.name.toLowerCase().includes('hibiscus');
  const minBulk = storefront?.settings?.min_bulk_kg || '1000';
  const whatsappClean = (storefront?.settings?.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-10">
      <div className="flex items-center gap-2 text-xs text-[#5A504A]">
        <Link to="/shop" className="hover:text-[#640B1A]">Shop</Link>
        <span>/</span>
        <Link to={`/shop?category=${product.category_slug}`} className="hover:text-[#640B1A]">
          {product.category_name}
        </Link>
        <span>/</span>
        <span className="text-[#1E1916] font-medium">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="rounded-2xl overflow-hidden border border-[#E5DDD0] bg-white aspect-[4/3]">
            <ImageWithFallback
              src={images[activeImageIdx]?.image_url}
              alt={images[activeImageIdx]?.alt_text || product.image_alt || product.name}
              className="w-full h-full object-cover"
            />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <button
                  key={img.id || idx}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`rounded-lg overflow-hidden border-2 aspect-[4/3] cursor-pointer ${
                    idx === activeImageIdx ? 'border-[#640B1A]' : 'border-transparent opacity-75 hover:opacity-100'
                  }`}
                >
                  <ImageWithFallback src={img.image_url} alt={img.alt_text || product.name} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Contiguous Purchase Module */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-[#E5DDD0] p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#5A504A] mb-2">
              <span>{product.category_name}</span>
              <span aria-hidden="true">·</span>
              <span className={available ? 'text-[#2B5B2C] font-semibold' : 'text-[#9F1239] font-semibold'}>
                {available ? 'Available' : 'Currently Out of Stock'}
              </span>
              {product.sku && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">{product.sku}</span>
                </>
              )}
            </div>
            <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#640B1A]">
              {product.name}
            </h1>
          </div>

          <div className="py-3 border-y border-[#F0EAE0]">
            {effectivePrice !== null ? (
              <div className="flex items-baseline gap-3">
                <span className="text-2xl sm:text-3xl font-bold text-[#1E1916] tabular-nums">
                  {formatMoney(effectivePrice)}
                </span>
                {hasPromo && (
                  <span className="text-base text-[#7D7168] line-through tabular-nums">
                    {formatMoney(activeVariant!.price)}
                  </span>
                )}
                <span className="text-xs text-[#5A504A]">per {activeVariant?.packaging_size}</span>
              </div>
            ) : (
              <p className="text-sm font-medium text-[#5A504A]">
                Price available on enquiry — add to cart to request pricing via WhatsApp.
              </p>
            )}
          </div>

          <p className="text-sm sm:text-base text-[#433A35] leading-relaxed">
            {product.description || product.short_description}
          </p>

          {/* Packaging Selector */}
          {variants.length > 0 && (
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-[#1E1916]">
                Select Packaging Size
              </label>
              <div className="flex flex-wrap gap-2">
                {variants.map((v) => {
                  const selected = activeVariant?.id === v.id;
                  const p = getEffectivePrice(v);
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-[#640B1A] text-white border-[#640B1A]'
                          : 'bg-[#FBF8F3] text-[#1E1916] border-[#D8CEC0] hover:border-[#640B1A]'
                      }`}
                    >
                      <span>{v.packaging_size}</span>
                      {p !== null && (
                        <span className={`ml-1.5 tabular-nums ${selected ? 'text-[#DFC48C]' : 'text-[#5A504A]'}`}>
                          ({formatMoney(p)})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity & Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <div className="inline-flex items-center border border-[#D8CEC0] rounded-lg bg-[#FBF8F3]">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="p-3 text-[#3B332E] hover:text-[#640B1A] cursor-pointer"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="px-4 font-mono text-sm tabular-nums font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                aria-label="Increase quantity"
                className="p-3 text-[#3B332E] hover:text-[#640B1A] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {activeVariant && available && (
              <button
                type="button"
                onClick={() => {
                  addToCart(product, activeVariant, quantity);
                  setCartOpen(true);
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-[#2B5B2C] text-white font-semibold text-sm hover:bg-[#1F4520] transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Add to Cart</span>
              </button>
            )}

            <a
              href={`https://wa.me/${whatsappClean}?text=${encodeURIComponent(
                `Hello Zobowellness, I have an enquiry about ${product.name} (${activeVariant?.packaging_size || ''}).`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg border border-[#640B1A] text-[#640B1A] font-semibold text-sm hover:bg-[#640B1A] hover:text-white transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Ask on WhatsApp</span>
            </a>
          </div>

          {isHibiscus && (
            <div className="p-4 rounded-xl bg-[#F4EFE6] border border-[#E5DDD0] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs sm:text-sm text-[#3B332E]">
                <strong className="text-[#640B1A]">Ordering {Number(minBulk).toLocaleString()}kg or more?</strong>
                <p className="text-[#5A504A] mt-0.5">Large commercial volumes are quoted directly by our wholesale desk.</p>
              </div>
              <Link
                to="/bulk-quote"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B5B2C] hover:underline whitespace-nowrap shrink-0"
              >
                <span>Bulk Quote</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
