import { useState } from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { Link } from '../lib/router.tsx';
import { ImageWithFallback } from './ImageWithFallback.tsx';

export function ProductCard({ product }: { product: Product }) {
  const { formatMoney, getEffectivePrice, addToCart } = useStore();
  const variants = product.variants || [];
  const defaultVariant = variants.find((v) => v.price !== null) || variants[0];
  const [selectedId, setSelectedId] = useState<number>(defaultVariant?.id || 0);

  const activeVariant = variants.find((v) => v.id === selectedId) || defaultVariant;
  const effectivePrice = activeVariant ? getEffectivePrice(activeVariant) : null;
  const hasPromo =
    activeVariant &&
    activeVariant.promo_price !== null &&
    activeVariant.promo_price !== undefined &&
    activeVariant.price !== null;

  const primaryImage = product.images?.[0]?.image_url || '/assets/botanical/hero-hibiscus.jpg';
  const available = product.is_available === 1 && product.stock_quantity > 0;

  return (
    <article className="group bg-white rounded-xl border border-[#E5DDD0] overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="block relative aspect-[4/3] bg-[#F4EFE6] overflow-hidden">
        <ImageWithFallback
          src={primaryImage}
          alt={product.image_alt || product.name}
          fallbackTitle={product.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </Link>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between gap-2 text-xs text-[#5A504A] mb-1.5">
          <span className="truncate">{product.category_name}</span>
          <span aria-hidden="true">·</span>
          <span className={available ? 'text-[#2B5B2C] font-medium whitespace-nowrap' : 'text-[#9F1239] font-medium whitespace-nowrap'}>
            {available ? 'In Stock' : 'Out of Stock'}
          </span>
        </div>

        <Link to={`/product/${product.slug}`} className="block mb-1.5">
          <h3 className="text-base font-semibold text-[#1E1916] group-hover:text-[#640B1A] transition-colors">
            {product.name}
          </h3>
        </Link>

        <p className="text-sm text-[#5A504A] line-clamp-2 mb-4 flex-1">
          {product.short_description}
        </p>

        {/* Interactive Packaging Selector */}
        {variants.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Packaging sizes">
              {variants.map((v) => {
                const isSelected = activeVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedId(v.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap cursor-pointer ${
                      isSelected
                        ? 'bg-[#640B1A] text-white'
                        : 'bg-[#F4EFE6] text-[#3B332E] hover:bg-[#E8DFD1]'
                    }`}
                  >
                    {v.packaging_size}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-[#F0EAE0] flex items-center justify-between gap-3">
          <div>
            {effectivePrice !== null ? (
              <div className="flex items-baseline gap-2">
                <span className="text-base font-bold text-[#640B1A] tabular-nums">
                  {formatMoney(effectivePrice)}
                </span>
                {hasPromo && (
                  <span className="text-xs text-[#7D7168] line-through tabular-nums">
                    {formatMoney(activeVariant!.price)}
                  </span>
                )}
              </div>
            ) : (
              <span className="text-xs font-medium text-[#5A504A]">Price on enquiry</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {activeVariant && available ? (
              <button
                type="button"
                onClick={() => addToCart(product, activeVariant, 1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#2B5B2C] text-white text-xs font-medium hover:bg-[#1F4520] transition-colors whitespace-nowrap cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            ) : (
              <Link
                to={`/product/${product.slug}`}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-[#D8CEC0] text-xs font-medium text-[#1E1916] hover:bg-[#F4EFE6] whitespace-nowrap"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}
