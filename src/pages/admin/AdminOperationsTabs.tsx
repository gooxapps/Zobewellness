import { useState } from 'react';
import { Plus, Trash2, Upload, MessageCircle, Save, Copy } from 'lucide-react';
import { Category, DeliverySettings, DeliveryZone, Testimonial } from '../../types.ts';
import { adminFetch } from '../../lib/adminFetch.ts';
import { ImageWithFallback } from '../../components/ImageWithFallback.tsx';

// 1. CATEGORIES TAB
export function AdminCategoriesTab({
  categories,
  onReload,
  onNotify,
}: {
  categories: Category[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newImg, setNewImg] = useState('/assets/botanical/herbs-leaves.jpg');
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await adminFetch('/api/admin/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, description: newDesc, image_url: newImg, sort_order: categories.length + 1 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not create category.');
      return;
    }
    setNewName('');
    setNewDesc('');
    await onReload();
    onNotify('Category created');
  };

  const handleUpdate = async (cat: Category, patch: Partial<Category>) => {
    const res = await adminFetch(`/api/admin/categories/${cat.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cat, ...patch }),
    });
    if (res.ok) {
      await onReload();
      onNotify(`Updated ${cat.name}`);
    }
  };

  const handleDelete = async (cat: Category) => {
    setError(null);
    const res = await adminFetch(`/api/admin/categories/${cat.id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Unable to delete category.');
      return;
    }
    await onReload();
    onNotify(`Removed ${cat.name}`);
  };

  return (
    <div className="space-y-6">
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}

      <form onSubmit={handleCreate} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Add Product Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            required
            placeholder="Category Name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="text"
            placeholder="Image URL"
            value={newImg}
            onChange={(e) => setNewImg(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="text"
            placeholder="Short description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-semibold hover:bg-[#4A0712] cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Category</span>
        </button>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
        {categories.map((cat) => (
          <div key={cat.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3 flex items-center gap-3">
              <ImageWithFallback src={cat.image_url} alt={cat.name} className="w-12 h-12 rounded-lg object-cover bg-neutral-100 shrink-0" />
              <input
                type="text"
                defaultValue={cat.name}
                onBlur={(e) => e.target.value !== cat.name && handleUpdate(cat, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-sm font-medium"
              />
            </div>
            <div className="md:col-span-4">
              <input
                type="text"
                defaultValue={cat.image_url}
                onBlur={(e) => e.target.value !== cat.image_url && handleUpdate(cat, { image_url: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs font-mono"
              />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <label className="text-xs text-neutral-500">Order</label>
              <input
                type="number"
                defaultValue={cat.sort_order}
                onBlur={(e) => handleUpdate(cat, { sort_order: Number(e.target.value) })}
                className="w-16 px-2 py-1.5 rounded border border-neutral-300 text-xs tabular-nums"
              />
            </div>
            <div className="md:col-span-3 flex items-center justify-end gap-3">
              <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={cat.is_active === 1}
                  onChange={(e) => handleUpdate(cat, { is_active: e.target.checked ? 1 : 0 })}
                />
                <span>Active</span>
              </label>
              <span className="text-xs text-neutral-500 tabular-nums">{cat.product_count ?? 0} items</span>
              <button
                type="button"
                onClick={() => handleDelete(cat)}
                className="p-1.5 text-neutral-500 hover:text-red-600 cursor-pointer"
                title="Delete category"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 2. ORDERS & ENQUIRIES TAB
export function AdminOrdersTab({
  orders,
  onReload,
  onNotify,
}: {
  orders: any[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState('All');
  const statuses = ['New enquiry', 'Awaiting confirmation', 'Confirmed', 'Processing', 'Completed', 'Cancelled'];

  const handleStatusChange = async (orderId: number, status: string) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      await onReload();
      onNotify(`Order status updated to ${status}`);
    }
  };

  const handleDelete = async (orderId: number) => {
    const res = await adminFetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
    if (res.ok) {
      await onReload();
      onNotify('Order enquiry removed');
    }
  };

  const filtered = orders.filter((o) => statusFilter === 'All' || o.status === statusFilter);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {['All', ...statuses].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
              statusFilter === st ? 'bg-[#640B1A] text-white' : 'bg-white border border-neutral-200 text-neutral-700'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center text-sm text-neutral-500">
          No order enquiries match this filter yet. Orders submitted via Cart checkout appear here automatically.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((o) => {
            const phoneClean = (o.customer_phone || '').replace(/[^\d]/g, '');
            return (
              <div key={o.id} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-semibold text-sm text-[#640B1A]">{o.order_number}</span>
                      <span className="text-xs text-neutral-500 tabular-nums">{o.created_at}</span>
                    </div>
                    <p className="text-sm font-medium text-neutral-900 mt-1">
                      {o.customer_name} · <span className="font-mono text-xs">{o.customer_phone}</span>
                    </p>
                    <p className="text-xs text-neutral-600">
                      {o.delivery_destination} — {o.delivery_address}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={o.status}
                      onChange={(e) => handleStatusChange(o.id, e.target.value)}
                      className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium bg-neutral-50"
                    >
                      {statuses.map((st) => (
                        <option key={st} value={st}>{st}</option>
                      ))}
                    </select>
                    {phoneClean && (
                      <a
                        href={`https://wa.me/${phoneClean}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5B2C] text-white text-xs font-medium"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(o.id)}
                      className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-1.5">
                    <p className="font-semibold text-neutral-700">Ordered Items</p>
                    {(o.items || []).map((it: any) => (
                      <div key={it.id} className="flex justify-between py-1 border-b border-neutral-100">
                        <span>
                          {it.product_name} ({it.packaging_size}) × {it.quantity}
                        </span>
                        <span className="font-mono tabular-nums">
                          {it.subtotal !== null ? `${o.currency} $${Number(it.subtotal).toFixed(2)}` : 'Quote pending'}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 font-semibold text-neutral-900">
                      <span>Estimated Total</span>
                      <span className="font-mono tabular-nums">
                        {o.currency} ${Number(o.estimated_total || 0).toFixed(2)}
                        {o.delivery_fee_pending ? ' (+ delivery)' : ''}
                      </span>
                    </div>
                  </div>
                  <div className="bg-neutral-50 rounded-lg p-3 font-mono text-[11px] text-neutral-700 whitespace-pre-wrap max-h-40 overflow-y-auto border border-neutral-200">
                    {o.whatsapp_message}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// 3. BULK QUOTATIONS TAB
export function AdminBulkQuotesTab({
  quotes,
  onReload,
  onNotify,
}: {
  quotes: any[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});

  const updateQuote = async (id: number, status: string, internal_notes?: string) => {
    const res = await adminFetch(`/api/admin/bulk-quotes/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, internal_notes }),
    });
    if (res.ok) {
      await onReload();
      onNotify('Bulk quotation updated');
    }
  };

  const deleteQuote = async (id: number) => {
    const res = await adminFetch(`/api/admin/bulk-quotes/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onReload();
      onNotify('Quotation deleted');
    }
  };

  if (quotes.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center text-sm text-neutral-500">
        No bulk quotation requests (1,000kg+) have been submitted yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {quotes.map((q) => {
        const phoneClean = (q.phone_contact || '').replace(/[^\d]/g, '');
        return (
          <div key={q.id} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="font-mono font-semibold text-sm text-[#640B1A]">{q.reference_code}</span>
                  <span className="text-xs text-neutral-500 tabular-nums">{q.created_at}</span>
                </div>
                <h4 className="text-base font-semibold text-neutral-900 mt-1">{q.company_name}</h4>
                <p className="text-xs text-neutral-600">
                  Location: <strong>{q.location}</strong> · Quantity: <strong>{q.quantity_required}</strong> · Phone:{' '}
                  <span className="font-mono">{q.phone_contact}</span>
                  {q.email ? ` · Email: ${q.email}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={q.status}
                  onChange={(e) => updateQuote(q.id, e.target.value, notesDraft[q.id] ?? q.internal_notes)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-medium bg-neutral-50"
                >
                  {['New', 'Contacted', 'Quoted', 'Closed', 'Archived'].map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                {phoneClean && (
                  <a
                    href={`https://wa.me/${phoneClean}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2B5B2C] text-white text-xs font-medium"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => deleteQuote(q.id)}
                  className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {q.notes && <p className="text-xs text-neutral-700 bg-neutral-50 p-2.5 rounded border border-neutral-200">{q.notes}</p>}
            {q.email_log && <p className="text-[11px] text-neutral-500">{q.email_log}</p>}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Internal admin notes..."
                value={notesDraft[q.id] ?? q.internal_notes ?? ''}
                onChange={(e) => setNotesDraft((prev) => ({ ...prev, [q.id]: e.target.value }))}
                className="flex-1 px-3 py-1.5 rounded-lg border border-neutral-300 text-xs"
              />
              <button
                type="button"
                onClick={() => updateQuote(q.id, q.status, notesDraft[q.id] ?? q.internal_notes)}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-xs font-medium cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Note</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 4. TESTIMONIALS TAB
export function AdminTestimonialsTab({
  testimonials,
  onReload,
  onNotify,
}: {
  testimonials: Testimonial[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', 'testimonial');
      fd.append('alt_text', caption || 'Customer WhatsApp testimonial screenshot');
      const upRes = await adminFetch('/api/admin/media/upload', { method: 'POST', body: fd });
      const upData = await upRes.json();
      if (!upRes.ok) throw new Error(upData.error || 'Upload failed');

      await adminFetch('/api/admin/testimonials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: upData.asset.url,
          caption: caption.trim(),
          alt_text: caption.trim() || 'Customer WhatsApp testimonial screenshot',
          sort_order: testimonials.length + 1,
          is_active: 1,
        }),
      });
      setCaption('');
      await onReload();
      onNotify('Testimonial screenshot uploaded');
    } finally {
      setUploading(false);
    }
  };

  const updateItem = async (t: Testimonial, patch: Partial<Testimonial>) => {
    await adminFetch(`/api/admin/testimonials/${t.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...t, ...patch }),
    });
    await onReload();
    onNotify('Testimonial updated');
  };

  const deleteItem = async (id: number) => {
    await adminFetch(`/api/admin/testimonials/${id}`, { method: 'DELETE' });
    await onReload();
    onNotify('Testimonial removed');
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Upload WhatsApp Testimonial Screenshot</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Optional screenshot caption (e.g. Lagos order feedback)"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <label className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-medium hover:bg-[#4A0712] cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Screenshot'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {testimonials.map((t) => (
          <div key={t.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col">
            <ImageWithFallback src={t.image_url} alt={t.alt_text} className="w-full h-56 object-cover object-top bg-neutral-100" />
            <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
              <input
                type="text"
                defaultValue={t.caption}
                placeholder="Screenshot caption"
                onBlur={(e) => e.target.value !== t.caption && updateItem(t, { caption: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs"
              />
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={t.is_active === 1}
                      onChange={(e) => updateItem(t, { is_active: e.target.checked ? 1 : 0 })}
                    />
                    <span>Visible</span>
                  </label>
                  <input
                    type="number"
                    defaultValue={t.sort_order}
                    onBlur={(e) => updateItem(t, { sort_order: Number(e.target.value) })}
                    className="w-14 px-2 py-1 rounded border border-neutral-300 text-xs tabular-nums"
                    title="Sort order"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteItem(t.id)}
                  className="p-1.5 text-neutral-500 hover:text-red-600 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 5. MEDIA LIBRARY TAB
export function AdminMediaTab({
  assets,
  onReload,
  onNotify,
}: {
  assets: any[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [category, setCategory] = useState('product');
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', category);
      const res = await adminFetch('/api/admin/media/upload', { method: 'POST', body: fd });
      if (res.ok) {
        await onReload();
        onNotify('Media asset uploaded');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const res = await adminFetch(`/api/admin/media/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await onReload();
      onNotify('Media asset removed');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          >
            <option value="product">Product Photo</option>
            <option value="logo">Brand Logo</option>
            <option value="banner">Homepage Banner</option>
            <option value="testimonial">Testimonial Screenshot</option>
            <option value="general">General Asset</option>
          </select>
          <label className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-medium hover:bg-[#4A0712] cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{uploading ? 'Uploading...' : 'Upload Image'}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleUpload(f);
              }}
            />
          </label>
        </div>
        <p className="text-xs text-neutral-500">JPG, PNG, WebP, or GIF up to 8MB.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {assets.map((a) => (
          <div key={a.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col">
            <ImageWithFallback src={a.url} alt={a.alt_text || a.original_name} className="w-full h-36 object-cover bg-neutral-100" />
            <div className="p-3 space-y-2">
              <p className="text-xs font-medium text-neutral-900 truncate">{a.original_name}</p>
              <div className="flex items-center justify-between text-[11px] text-neutral-500">
                <span>{a.category}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(a.url);
                      onNotify('Image URL copied');
                    }}
                    className="inline-flex items-center gap-1 text-[#640B1A] hover:underline cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy URL</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(a.id)}
                    className="text-neutral-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// 6. DELIVERY MANAGEMENT TAB
export function AdminDeliveryTab({
  zones,
  settings,
  currency,
  onReload,
  onNotify,
}: {
  zones: DeliveryZone[];
  settings: DeliverySettings;
  currency: string;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [newName, setNewName] = useState('');
  const [newFee, setNewFee] = useState('');
  const [newThresh, setNewThresh] = useState('');
  const [newEst, setNewEst] = useState('');

  const [policyText, setPolicyText] = useState(settings?.policy_text || '');
  const [notice, setNotice] = useState(settings?.temporary_notice || '');
  const [available, setAvailable] = useState((settings?.is_delivery_available ?? 1) === 1);

  const addZone = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/delivery/zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName,
        fee: newFee.trim() === '' ? null : Number(newFee),
        free_threshold: newThresh.trim() === '' ? null : Number(newThresh),
        estimated_time: newEst,
        sort_order: zones.length + 1,
      }),
    });
    if (res.ok) {
      setNewName('');
      setNewFee('');
      setNewThresh('');
      setNewEst('');
      await onReload();
      onNotify('Delivery destination added');
    }
  };

  const updateZone = async (z: DeliveryZone, patch: Partial<DeliveryZone>) => {
    const res = await adminFetch(`/api/admin/delivery/zones/${z.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...z, ...patch }),
    });
    if (res.ok) {
      await onReload();
      onNotify(`Updated ${z.name}`);
    }
  };

  const deleteZone = async (id: number) => {
    await adminFetch(`/api/admin/delivery/zones/${id}`, { method: 'DELETE' });
    await onReload();
    onNotify('Delivery destination deleted');
  };

  const savePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/delivery/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policy_text: policyText, temporary_notice: notice, is_delivery_available: available }),
    });
    if (res.ok) {
      await onReload();
      onNotify('Delivery settings saved');
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={addZone} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-3">
        <h3 className="text-sm font-semibold text-neutral-900">Add Delivery Destination</h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <input
            type="text"
            required
            placeholder="Destination (e.g. Canada)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="number"
            step="0.01"
            placeholder={`Fee (${currency}) - blank = WhatsApp`}
            value={newFee}
            onChange={(e) => setNewFee(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm tabular-nums"
          />
          <input
            type="number"
            step="0.01"
            placeholder={`Free over (${currency})`}
            value={newThresh}
            onChange={(e) => setNewThresh(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm tabular-nums"
          />
          <input
            type="text"
            placeholder="Estimated delivery time"
            value={newEst}
            onChange={(e) => setNewEst(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Destination</span>
        </button>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
        {zones.map((z) => (
          <div key={z.id} className="p-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            <div className="md:col-span-3">
              <input
                type="text"
                defaultValue={z.name}
                onBlur={(e) => e.target.value !== z.name && updateZone(z, { name: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-sm font-medium"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="number"
                step="0.01"
                placeholder="WhatsApp confirm"
                defaultValue={z.fee ?? ''}
                onBlur={(e) => updateZone(z, { fee: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs tabular-nums"
              />
            </div>
            <div className="md:col-span-2">
              <input
                type="number"
                step="0.01"
                placeholder="Free threshold"
                defaultValue={z.free_threshold ?? ''}
                onBlur={(e) => updateZone(z, { free_threshold: e.target.value === '' ? null : Number(e.target.value) })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs tabular-nums"
              />
            </div>
            <div className="md:col-span-3">
              <input
                type="text"
                defaultValue={z.estimated_time}
                placeholder="Delivery estimate"
                onBlur={(e) => updateZone(z, { estimated_time: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs"
              />
            </div>
            <div className="md:col-span-2 flex items-center justify-end gap-2">
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={z.is_active === 1}
                  onChange={(e) => updateZone(z, { is_active: e.target.checked ? 1 : 0 })}
                />
                <span>Active</span>
              </label>
              <button
                type="button"
                onClick={() => deleteZone(z.id)}
                className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={savePolicy} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
        <h3 className="text-sm font-semibold text-neutral-900">Delivery Policy & Temporary Availability</h3>
        <label className="inline-flex items-center gap-2 text-sm text-neutral-800 cursor-pointer">
          <input type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)} />
          <span>Delivery Currently Available</span>
        </label>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Temporary Notice Banner (Optional)</label>
          <input
            type="text"
            value={notice}
            onChange={(e) => setNotice(e.target.value)}
            placeholder="e.g. Holiday dispatch schedule..."
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Delivery Information & Policy Text</label>
          <textarea
            rows={4}
            value={policyText}
            onChange={(e) => setPolicyText(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>Save Delivery Settings</span>
        </button>
      </form>
    </div>
  );
}
