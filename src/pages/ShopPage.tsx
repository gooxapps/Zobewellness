import { useEffect, useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Product } from '../types.ts';
import { useStore } from '../context/StoreContext.tsx';
import { Link, useRouter } from '../lib/router.tsx';
import { ProductCard } from '../components/ProductCard.tsx';

export function ShopPage() {
  const { storefront } = useStore();
  const { search } = useRouter();

  const params = new URLSearchParams(search);
  const initialCat = params.get('category') || 'all';
  const initialSearch = params.get('search') || '';

  const [selectedCategory, setSelectedCategory] = useState(initialCat);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = new URLSearchParams(search);
    setSelectedCategory(p.get('category') || 'all');
    if (p.has('search')) setSearchQuery(p.get('search') || '');
  }, [search]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const qs = new URLSearchParams();
    if (selectedCategory !== 'all') qs.set('category', selectedCategory);
    if (searchQuery.trim()) qs.set('search', searchQuery.trim());

    fetch(`/api/products?${qs.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch(() => {
        if (active) setProducts([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [selectedCategory, searchQuery]);

  const categories = storefront?.categories || [];
  const minBulk = storefront?.settings?.min_bulk_kg || '1000';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14 space-y-8">
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#640B1A]">
            Shop Botanical Products
          </h1>
          <p className="text-sm sm:text-base text-[#5A504A] mt-2 max-w-2xl">
            Cleaned Grade A hibiscus leaves, botanical leaves, flowers, berries, seeds, and milled powders. All prices shown in{' '}
            <span className="font-semibold text-[#1E1916]">{storefront?.settings?.currency || 'CAD'}</span>.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-80">
          <Search className="w-4 h-4 text-[#7D7168] absolute left-3.5 top-3" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
          />
        </div>
      </div>

      {/* Category Filter Bar */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-[#E5DDD0]">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-[#640B1A] text-white'
              : 'bg-white border border-[#E5DDD0] text-[#3B332E] hover:bg-[#F4EFE6]'
          }`}
        >
          All Categories
        </button>
        {categories.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setSelectedCategory(c.slug)}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === c.slug
                ? 'bg-[#640B1A] text-white'
                : 'bg-white border border-[#E5DDD0] text-[#3B332E] hover:bg-[#F4EFE6]'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Bulk 1000kg+ callout */}
      <div className="rounded-xl bg-[#F4EFE6] border border-[#E5DDD0] px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <p className="text-sm text-[#3B332E]">
          Need <strong className="text-[#640B1A] tabular-nums">{Number(minBulk).toLocaleString()}kg or more</strong> of Grade A hibiscus leaves for wholesale or commercial production?
        </p>
        <Link
          to="/bulk-quote"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2B5B2C] hover:underline whitespace-nowrap shrink-0"
        >
          <span>Request a Bulk Quotation</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Product Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-xl border border-[#E5DDD0] h-96 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5DDD0] p-12 text-center space-y-3">
          <p className="text-base font-semibold text-[#1E1916]">No matching products found</p>
          <p className="text-sm text-[#5A504A]">
            Try clearing your search filter or switching to All Categories.
          </p>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-medium cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
