import { useState } from 'react';
import { Plus, Pencil, Trash2, Upload, X, Search } from 'lucide-react';
import { Category, Product } from '../../types.ts';
import { adminFetch } from '../../lib/adminFetch.ts';
import { ImageWithFallback } from '../../components/ImageWithFallback.tsx';

interface VariantDraft {
  packaging_size: string;
  weight_grams: number;
  price: string;
  promo_price: string;
  stock_quantity: number;
  is_available: boolean;
}

interface ImageDraft {
  image_url: string;
  alt_text: string;
}

export function AdminProductsTab({
  products,
  categories,
  mediaAssets,
  currency,
  onReload,
  onNotify,
}: {
  products: Product[];
  categories: Category[];
  mediaAssets: Array<{ id: number; original_name: string; url: string }>;
  currency: string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [editing, setEditing] = useState<Product | 'new' | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [shortDesc, setShortDesc] = useState('');
  const [desc, setDesc] = useState('');
  const [stockQty, setStockQty] = useState(100);
  const [isAvailable, setIsAvailable] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [seoTitle, setSeoTitle] = useState('');
  const [seoDesc, setSeoDesc] = useState('');
  const [imageAlt, setImageAlt] = useState('');
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [images, setImages] = useState<ImageDraft[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const openNew = () => {
    setEditing('new');
    setName('');
    setCategoryId(categories[0]?.id || 1);
    setSlug('');
    setSku('');
    setShortDesc('');
    setDesc('');
    setStockQty(100);
    setIsAvailable(true);
    setIsFeatured(false);
    setIsVisible(true);
    setSeoTitle('');
    setSeoDesc('');
    setImageAlt('');
    setVariants([
      { packaging_size: '100g', weight_grams: 100, price: '', promo_price: '', stock_quantity: 100, is_available: true },
      { packaging_size: '250g', weight_grams: 250, price: '', promo_price: '', stock_quantity: 100, is_available: true },
      { packaging_size: '500g', weight_grams: 500, price: '', promo_price: '', stock_quantity: 100, is_available: true },
      { packaging_size: '1kg', weight_grams: 1000, price: '', promo_price: '', stock_quantity: 100, is_available: true },
    ]);
    setImages([]);
    setFormError(null);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setName(p.name);
    setCategoryId(p.category_id);
    setSlug(p.slug);
    setSku(p.sku);
    setShortDesc(p.short_description);
    setDesc(p.description);
    setStockQty(p.stock_quantity);
    setIsAvailable(p.is_available === 1);
    setIsFeatured(p.is_featured === 1);
    setIsVisible(p.is_visible === 1);
    setSeoTitle(p.seo_title);
    setSeoDesc(p.seo_description);
    setImageAlt(p.image_alt);
    setVariants(
      (p.variants || []).map((v) => ({
        packaging_size: v.packaging_size,
        weight_grams: v.weight_grams,
        price: v.price !== null && v.price !== undefined ? String(v.price) : '',
        promo_price: v.promo_price !== null && v.promo_price !== undefined ? String(v.promo_price) : '',
        stock_quantity: v.stock_quantity,
        is_available: v.is_available === 1,
      }))
    );
    setImages(
      (p.images || []).map((i) => ({
        image_url: i.image_url,
        alt_text: i.alt_text,
      }))
    );
    setFormError(null);
  };

  const handleUploadImage = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'product');
      fd.append('alt_text', name || file.name);
      const res = await adminFetch('/api/admin/media/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed.');
      setImages((prev) => [...prev, { image_url: data.asset.url, alt_text: name || data.asset.original_name }]);
      onNotify('Image uploaded and attached to product');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name,
        category_id: categoryId,
        slug,
        sku,
        short_description: shortDesc,
        description: desc,
        stock_quantity: stockQty,
        is_available: isAvailable,
        is_featured: isFeatured,
        is_visible: isVisible,
        seo_title: seoTitle,
        seo_description: seoDesc,
        image_alt: imageAlt,
        variants: variants.map((v) => ({
          packaging_size: v.packaging_size,
          weight_grams: v.weight_grams,
          price: v.price.trim() === '' ? null : Number(v.price),
          promo_price: v.promo_price.trim() === '' ? null : Number(v.promo_price),
          stock_quantity: v.stock_quantity,
          is_available: v.is_available,
        })),
        images,
      };

      const isNew = editing === 'new';
      const url = isNew ? '/api/admin/products' : `/api/admin/products/${(editing as Product).id}`;
      const res = await adminFetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not save product.');
      await onReload();
      setEditing(null);
      onNotify(isNew ? 'Product created successfully' : 'Product updated successfully');
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: Product) => {
    const res = await adminFetch(`/api/admin/products/${p.id}`, { method: 'DELETE' });
    if (res.ok) {
      await onReload();
      onNotify(`Deleted "${p.name}"`);
    }
  };

  const filtered = products.filter((p) => {
    const matchesCat = catFilter === 'all' || String(p.category_id) === catFilter;
    const matchesSearch =
      !search.trim() ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  if (editing) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-200 pb-4">
          <h2 className="text-lg font-semibold text-neutral-900">
            {editing === 'new' ? 'Add New Botanical Product' : `Edit Product: ${editing.name}`}
          </h2>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="p-2 rounded-lg text-neutral-500 hover:bg-neutral-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {formError && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{formError}</div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Category *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">URL Slug</label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="auto-generated-from-name"
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">SKU</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Stock Quantity</label>
              <input
                type="number"
                value={stockQty}
                onChange={(e) => setStockQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm tabular-nums"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-6 py-2">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} />
              <span>Available for Order</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input type="checkbox" checked={isFeatured} onChange={(e) => setIsFeatured(e.target.checked)} />
              <span>Featured on Homepage</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
              <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)} />
              <span>Visible on Storefront</span>
            </label>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Short Description</label>
            <input
              type="text"
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-700 mb-1">Full Product Description</label>
            <textarea
              rows={3}
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
            />
          </div>

          {/* Packaging Sizes & Dynamic CAD Pricing */}
          <div className="space-y-3 border-t border-neutral-200 pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">
                  Packaging Sizes & Dynamic Pricing ({currency})
                </h3>
                <p className="text-xs text-neutral-500">Leave price empty if item requires an enquiry quote.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setVariants((prev) => [
                    ...prev,
                    { packaging_size: '', weight_grams: 0, price: '', promo_price: '', stock_quantity: 100, is_available: true },
                  ])
                }
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 text-xs font-medium text-neutral-800 hover:bg-neutral-200 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Size</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-2 sm:grid-cols-6 gap-2 items-center bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                  <input
                    type="text"
                    placeholder="Size (e.g. 5kg)"
                    value={v.packaging_size}
                    onChange={(e) =>
                      setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, packaging_size: e.target.value } : item)))
                    }
                    className="px-2.5 py-1.5 rounded border border-neutral-300 text-xs bg-white"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder={`Price (${currency})`}
                    value={v.price}
                    onChange={(e) =>
                      setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, price: e.target.value } : item)))
                    }
                    className="px-2.5 py-1.5 rounded border border-neutral-300 text-xs bg-white tabular-nums"
                  />
                  <input
                    type="number"
                    step="0.01"
                    placeholder="Promo Price"
                    value={v.promo_price}
                    onChange={(e) =>
                      setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, promo_price: e.target.value } : item)))
                    }
                    className="px-2.5 py-1.5 rounded border border-neutral-300 text-xs bg-white tabular-nums"
                  />
                  <input
                    type="number"
                    placeholder="Stock"
                    value={v.stock_quantity}
                    onChange={(e) =>
                      setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, stock_quantity: Number(e.target.value) } : item)))
                    }
                    className="px-2.5 py-1.5 rounded border border-neutral-300 text-xs bg-white tabular-nums"
                  />
                  <label className="inline-flex items-center gap-1.5 text-xs text-neutral-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={v.is_available}
                      onChange={(e) =>
                        setVariants((prev) => prev.map((item, i) => (i === idx ? { ...item, is_available: e.target.checked } : item)))
                      }
                    />
                    <span>Active</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setVariants((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-600 hover:underline justify-self-end cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Multi-Image Manager */}
          <div className="space-y-3 border-t border-neutral-200 pt-4">
            <h3 className="text-sm font-semibold text-neutral-900">Product Photographs</h3>
            <div className="flex flex-wrap gap-3 items-center">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-medium hover:bg-[#4A0712] cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUploadImage(f);
                  }}
                />
              </label>

              <select
                value=""
                onChange={(e) => {
                  const chosen = mediaAssets.find((m) => m.url === e.target.value);
                  if (chosen) {
                    setImages((prev) => [...prev, { image_url: chosen.url, alt_text: name || chosen.original_name }]);
                  }
                }}
                className="px-3 py-2 rounded-lg border border-neutral-300 text-xs bg-white"
              >
                <option value="">Attach from Media Library...</option>
                {mediaAssets.map((m) => (
                  <option key={m.id} value={m.url}>
                    {m.original_name}
                  </option>
                ))}
              </select>

              <div className="flex gap-2 flex-1 min-w-[220px]">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="Or paste image URL (e.g. /assets/botanical/hero-hibiscus.jpg)"
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newImageUrl.trim()) {
                      setImages((prev) => [...prev, { image_url: newImageUrl.trim(), alt_text: name }]);
                      setNewImageUrl('');
                    }
                  }}
                  className="px-3 py-2 rounded-lg bg-neutral-100 text-xs font-medium hover:bg-neutral-200 cursor-pointer"
                >
                  Attach
                </button>
              </div>
            </div>

            {images.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {images.map((img, idx) => (
                  <div key={idx} className="relative rounded-lg border border-neutral-200 overflow-hidden bg-neutral-50">
                    <ImageWithFallback src={img.image_url} alt={img.alt_text || name} className="w-full h-24 object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/65 text-white hover:bg-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    {idx === 0 && (
                      <span className="block text-[11px] text-center py-0.5 bg-[#2B5B2C] text-white">Primary</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEO Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-neutral-200 pt-4">
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">SEO Meta Title</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">Primary Image Alt Text</label>
              <input
                type="text"
                value={imageAlt}
                onChange={(e) => setImageAlt(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1">SEO Meta Description</label>
              <input
                type="text"
                value={seoDesc}
                onChange={(e) => setSeoDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="px-4 py-2 rounded-lg border border-neutral-300 text-sm font-medium text-neutral-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] disabled:opacity-60 cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-2.5" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search products or SKU..."
              className="pl-9 pr-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm w-60"
            />
          </div>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 bg-white text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 border-b border-neutral-200 text-xs text-neutral-600">
            <tr>
              <th className="py-3 px-4">Product</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Packaging & Prices ({currency})</th>
              <th className="py-3 px-4 text-right">Stock</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-200">
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-neutral-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <ImageWithFallback
                      src={p.images?.[0]?.image_url}
                      alt={p.name}
                      className="w-10 h-10 rounded-lg object-cover bg-neutral-100 shrink-0"
                    />
                    <div>
                      <div className="font-medium text-neutral-900">{p.name}</div>
                      <div className="text-xs text-neutral-500 font-mono">{p.sku}</div>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 text-xs text-neutral-600">{p.category_name}</td>
                <td className="py-3 px-4 text-xs text-neutral-700 tabular-nums">
                  {(p.variants || []).map((v) => `${v.packaging_size}: ${v.price !== null ? `$${v.price}` : 'Quote'}`).join(' · ')}
                </td>
                <td className="py-3 px-4 text-right font-mono tabular-nums">{p.stock_quantity}</td>
                <td className="py-3 px-4 text-xs">
                  <span className={p.is_available ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                    {p.is_available ? 'Available' : 'Unavailable'}
                  </span>
                  {!p.is_visible && <span className="ml-1.5 text-neutral-400">(Hidden)</span>}
                  {p.is_featured === 1 && <span className="ml-1.5 text-amber-700 font-medium">· Featured</span>}
                </td>
                <td className="py-3 px-4 text-right whitespace-nowrap">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    className="p-1.5 text-neutral-600 hover:text-[#640B1A] cursor-pointer"
                    title="Edit product"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(p)}
                    className="p-1.5 text-neutral-500 hover:text-red-600 cursor-pointer ml-1"
                    title="Delete product"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
