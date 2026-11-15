import { useState } from 'react';
import { Save, Plus, Trash2, ExternalLink } from 'lucide-react';
import { adminFetch } from '../../lib/adminFetch.ts';
import { HomepageSection, NavigationItem, WebsitePage } from '../../types.ts';

// 7. HOMEPAGE EDITOR
export function AdminHomepageTab({
  sections,
  onReload,
  onNotify,
}: {
  sections: HomepageSection[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, HomepageSection>>(() => {
    const map: Record<string, HomepageSection> = {};
    sections.forEach((s) => {
      map[s.section_key] = { ...s };
    });
    return map;
  });

  const saveSection = async (key: string) => {
    const s = drafts[key];
    const res = await adminFetch(`/api/admin/homepage/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(s),
    });
    if (res.ok) {
      await onReload();
      onNotify(`Saved ${s.label}`);
    }
  };

  return (
    <div className="space-y-6">
      {sections.map((sec) => {
        const d = drafts[sec.section_key] || sec;
        const setField = (field: keyof HomepageSection, val: any) =>
          setDrafts((prev) => ({ ...prev, [sec.section_key]: { ...d, [field]: val } }));

        return (
          <div key={sec.section_key} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">{sec.label}</h3>
                <p className="text-xs text-neutral-500 font-mono">{sec.section_key}</p>
              </div>
              <button
                type="button"
                onClick={() => saveSection(sec.section_key)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#640B1A] text-white text-xs font-semibold hover:bg-[#4A0712] cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Section</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Headline / Title</label>
                <input
                  type="text"
                  value={d.title}
                  onChange={(e) => setField('title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Subtitle / Kicker</label>
                <input
                  type="text"
                  value={d.subtitle}
                  onChange={(e) => setField('subtitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Primary CTA Label</label>
                <input
                  type="text"
                  value={d.cta_primary_label}
                  onChange={(e) => setField('cta_primary_label', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Secondary CTA Label</label>
                <input
                  type="text"
                  value={d.cta_secondary_label}
                  onChange={(e) => setField('cta_secondary_label', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">Image URL</label>
                <input
                  type="text"
                  value={d.image_url}
                  onChange={(e) => setField('image_url', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">Body Copy</label>
                <textarea
                  rows={2}
                  value={d.body}
                  onChange={(e) => setField('body', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 8. WEBSITE FEATURE CONTROLS
export function AdminFeaturesTab({
  sections,
  settings,
  onReload,
  onNotify,
}: {
  sections: HomepageSection[];
  settings: Record<string, string>;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const toggleSection = async (sec: HomepageSection) => {
    const next = sec.is_enabled === 1 ? 0 : 1;
    const res = await adminFetch(`/api/admin/homepage/${sec.section_key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_enabled: next }),
    });
    if (res.ok) {
      await onReload();
      onNotify(`${sec.label} ${next ? 'enabled' : 'disabled'}`);
    }
  };

  const toggleSetting = async (key: string, currentVal: string) => {
    const next = currentVal === 'true' ? 'false' : 'true';
    const res = await adminFetch('/api/admin/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: { [key]: next } }),
    });
    if (res.ok) {
      await onReload();
      onNotify('Feature setting updated');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
        <div className="p-4 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-900">Homepage & Storefront Section Switches</h3>
          <p className="text-xs text-neutral-500">Disabled sections disappear cleanly from the public website without breaking layout.</p>
        </div>
        {sections.map((sec) => (
          <div key={sec.section_key} className="p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-neutral-900">{sec.label}</p>
              <p className="text-xs text-neutral-500">{sec.title || sec.section_key}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleSection(sec)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                sec.is_enabled === 1
                  ? 'bg-[#2B5B2C] text-white'
                  : 'bg-neutral-200 text-neutral-700'
              }`}
            >
              {sec.is_enabled === 1 ? 'Enabled' : 'Disabled'}
            </button>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">Bulk Quotation Submissions</p>
            <p className="text-xs text-neutral-500">Allow commercial buyers (1,000kg+) to submit quote requests</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting('bulk_quote_enabled', settings.bulk_quote_enabled || 'true')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              settings.bulk_quote_enabled !== 'false' ? 'bg-[#2B5B2C] text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {settings.bulk_quote_enabled !== 'false' ? 'Enabled' : 'Disabled'}
          </button>
        </div>

        <div className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-900">Website Maintenance Mode</p>
            <p className="text-xs text-neutral-500">Display a maintenance notice to visitors while preserving admin access</p>
          </div>
          <button
            type="button"
            onClick={() => toggleSetting('maintenance_mode', settings.maintenance_mode || 'false')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              settings.maintenance_mode === 'true' ? 'bg-amber-600 text-white' : 'bg-neutral-200 text-neutral-700'
            }`}
          >
            {settings.maintenance_mode === 'true' ? 'Active' : 'Off'}
          </button>
        </div>
      </div>
    </div>
  );
}

// 9. WEBSITE PAGES EDITOR
export function AdminPagesTab({
  pages,
  onReload,
  onNotify,
}: {
  pages: WebsitePage[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [drafts, setDrafts] = useState<Record<string, WebsitePage>>(() => {
    const map: Record<string, WebsitePage> = {};
    pages.forEach((p) => {
      map[p.slug] = { ...p };
    });
    return map;
  });

  const savePage = async (slug: string) => {
    const p = drafts[slug];
    const res = await adminFetch(`/api/admin/pages/${slug}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(p),
    });
    if (res.ok) {
      await onReload();
      onNotify(`Saved page /${slug}`);
    }
  };

  return (
    <div className="space-y-6">
      {pages.map((p) => {
        const d = drafts[p.slug] || p;
        const setField = (field: keyof WebsitePage, val: any) =>
          setDrafts((prev) => ({ ...prev, [p.slug]: { ...d, [field]: val } }));

        return (
          <div key={p.slug} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div>
                <h3 className="text-sm font-semibold text-neutral-900">{p.title}</h3>
                <p className="text-xs text-neutral-500 font-mono">/{p.slug}</p>
              </div>
              <button
                type="button"
                onClick={() => savePage(p.slug)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#640B1A] text-white text-xs font-semibold cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Page</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Hero Title</label>
                <input
                  type="text"
                  value={d.hero_title}
                  onChange={(e) => setField('hero_title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">Hero Subtitle</label>
                <input
                  type="text"
                  value={d.hero_subtitle}
                  onChange={(e) => setField('hero_subtitle', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-neutral-700 mb-1">Page Body Content</label>
                <textarea
                  rows={4}
                  value={d.body}
                  onChange={(e) => setField('body', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">SEO Title</label>
                <input
                  type="text"
                  value={d.seo_title}
                  onChange={(e) => setField('seo_title', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">SEO Description</label>
                <input
                  type="text"
                  value={d.seo_description}
                  onChange={(e) => setField('seo_description', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs"
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// 10. NAVIGATION MANAGEMENT
export function AdminNavigationTab({
  items,
  onReload,
  onNotify,
}: {
  items: NavigationItem[];
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [label, setLabel] = useState('');
  const [href, setHref] = useState('/');
  const [location, setLocation] = useState('header');

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch('/api/admin/navigation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ label, href, location, sort_order: items.length + 1 }),
    });
    if (res.ok) {
      setLabel('');
      await onReload();
      onNotify('Navigation link added');
    }
  };

  const updateItem = async (item: NavigationItem, patch: Partial<NavigationItem>) => {
    await adminFetch(`/api/admin/navigation/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, ...patch }),
    });
    await onReload();
    onNotify('Navigation updated');
  };

  const deleteItem = async (id: number) => {
    await adminFetch(`/api/admin/navigation/${id}`, { method: 'DELETE' });
    await onReload();
    onNotify('Navigation link removed');
  };

  return (
    <div className="space-y-6">
      <form onSubmit={addItem} className="bg-white rounded-xl border border-neutral-200 p-5 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Link Label</label>
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Wholesale"
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Path / URL</label>
          <input
            type="text"
            required
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="/shop"
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Location</label>
          <select
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          >
            <option value="header">Header</option>
            <option value="footer">Footer</option>
          </select>
        </div>
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Link</span>
        </button>
      </form>

      <div className="bg-white rounded-xl border border-neutral-200 divide-y divide-neutral-200">
        {items.map((it) => (
          <div key={it.id} className="p-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-3">
              <input
                type="text"
                defaultValue={it.label}
                onBlur={(e) => e.target.value !== it.label && updateItem(it, { label: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-sm"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                defaultValue={it.href}
                onBlur={(e) => e.target.value !== it.href && updateItem(it, { href: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded border border-neutral-300 text-xs font-mono"
              />
            </div>
            <div className="sm:col-span-2 text-xs font-medium text-neutral-600 uppercase">{it.location}</div>
            <div className="sm:col-span-2">
              <input
                type="number"
                defaultValue={it.sort_order}
                onBlur={(e) => updateItem(it, { sort_order: Number(e.target.value) })}
                className="w-16 px-2 py-1 rounded border border-neutral-300 text-xs tabular-nums"
              />
            </div>
            <div className="sm:col-span-2 flex items-center justify-end gap-2">
              <label className="inline-flex items-center gap-1 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={it.is_active === 1}
                  onChange={(e) => updateItem(it, { is_active: e.target.checked ? 1 : 0 })}
                />
                <span>Show</span>
              </label>
              <button
                type="button"
                onClick={() => deleteItem(it.id)}
                className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer"
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

// 11. CONTACT MESSAGES & INFO
export function AdminContactsTab({
  messages,
  onReload,
}: {
  messages: any[];
  onReload: () => Promise<void>;
}) {
  const toggleRead = async (m: any) => {
    await adminFetch(`/api/admin/contacts/${m.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: m.status === 'Unread' ? 'Read' : 'Unread' }),
    });
    await onReload();
  };

  const remove = async (id: number) => {
    await adminFetch(`/api/admin/contacts/${id}`, { method: 'DELETE' });
    await onReload();
  };

  return (
    <div className="space-y-4">
      {messages.length === 0 ? (
        <div className="bg-white rounded-xl border border-neutral-200 p-10 text-center text-sm text-neutral-500">
          No contact form messages yet.
        </div>
      ) : (
        messages.map((m) => (
          <div key={m.id} className="bg-white rounded-xl border border-neutral-200 p-5 space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-neutral-900">
                  {m.name} · <span className="font-normal text-neutral-600">{m.email}</span>
                  {m.phone ? ` · ${m.phone}` : ''}
                </p>
                {m.subject && <p className="text-xs font-medium text-[#640B1A] mt-0.5">{m.subject}</p>}
                <p className="text-xs text-neutral-500 tabular-nums mt-0.5">{m.created_at}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleRead(m)}
                  className={`px-3 py-1 rounded text-xs font-medium cursor-pointer ${
                    m.status === 'Unread' ? 'bg-[#640B1A] text-white' : 'bg-neutral-100 text-neutral-700'
                  }`}
                >
                  {m.status}
                </button>
                <button type="button" onClick={() => remove(m.id)} className="p-1.5 text-neutral-400 hover:text-red-600 cursor-pointer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-sm text-neutral-800 whitespace-pre-line pt-1">{m.message}</p>
          </div>
        ))
      )}
    </div>
  );
}

// 12. GLOBAL SETTINGS & SEO SETTINGS
export function AdminSettingsTab({
  settings,
  mode,
  onReload,
  onNotify,
}: {
  settings: Record<string, string>;
  mode: 'global' | 'seo';
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [form, setForm] = useState<Record<string, string>>({ ...settings });
  const [saving, setSaving] = useState(false);

  const setVal = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminFetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: form }),
      });
      if (res.ok) {
        await onReload();
        onNotify(mode === 'seo' ? 'SEO settings saved' : 'Global settings saved');
      }
    } finally {
      setSaving(false);
    }
  };

  if (mode === 'seo') {
    return (
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
        <h3 className="text-base font-semibold text-neutral-900">Default SEO & Search Indexing</h3>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Default Meta Title</label>
          <input
            type="text"
            value={form.seo_default_title || ''}
            onChange={(e) => setVal('seo_default_title', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Default Meta Description</label>
          <textarea
            rows={3}
            value={form.seo_default_description || ''}
            onChange={(e) => setVal('seo_default_description', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-4 pt-2 text-xs">
          <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#640B1A] hover:underline">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View Dynamic sitemap.xml</span>
          </a>
          <a href="/robots.txt" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#640B1A] hover:underline">
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View robots.txt</span>
          </a>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-semibold cursor-pointer"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Saving...' : 'Save SEO Settings'}</span>
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 space-y-4">
      <h3 className="text-base font-semibold text-neutral-900">Global Business & Storefront Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Business Name</label>
          <input
            type="text"
            value={form.business_name || ''}
            onChange={(e) => setVal('business_name', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Website URL</label>
          <input
            type="text"
            value={form.website_url || ''}
            onChange={(e) => setVal('website_url', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">WhatsApp Ordering Number</label>
          <input
            type="text"
            value={form.whatsapp_number || ''}
            onChange={(e) => setVal('whatsapp_number', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Business Email</label>
          <input
            type="email"
            value={form.business_email || ''}
            onChange={(e) => setVal('business_email', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Bulk Quotation Receiving Email</label>
          <input
            type="email"
            value={form.quotation_email || ''}
            onChange={(e) => setVal('quotation_email', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Storefront Currency</label>
          <input
            type="text"
            value={form.currency || 'CAD'}
            onChange={(e) => setVal('currency', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Minimum Bulk Quote Quantity (kg)</label>
          <input
            type="number"
            value={form.min_bulk_kg || '1000'}
            onChange={(e) => setVal('min_bulk_kg', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm tabular-nums"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Tagline</label>
          <input
            type="text"
            value={form.tagline || ''}
            onChange={(e) => setVal('tagline', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Light Background Logo URL</label>
          <input
            type="text"
            value={form.light_logo_url || ''}
            onChange={(e) => setVal('light_logo_url', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-neutral-700 mb-1">Dark Background Logo URL</label>
          <input
            type="text"
            value={form.dark_logo_url || ''}
            onChange={(e) => setVal('dark_logo_url', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-neutral-700 mb-1">Announcement Bar Fallback Text</label>
          <input
            type="text"
            value={form.announcement_text || ''}
            onChange={(e) => setVal('announcement_text', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-neutral-200 space-y-3">
        <h4 className="text-sm font-semibold text-neutral-900">Social Media Links (Optional)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="url"
            placeholder="Facebook URL"
            value={form.social_facebook || ''}
            onChange={(e) => setVal('social_facebook', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="url"
            placeholder="Instagram URL"
            value={form.social_instagram || ''}
            onChange={(e) => setVal('social_instagram', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="url"
            placeholder="YouTube URL"
            value={form.social_youtube || ''}
            onChange={(e) => setVal('social_youtube', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="url"
            placeholder="LinkedIn URL"
            value={form.social_linkedin || ''}
            onChange={(e) => setVal('social_linkedin', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
          <input
            type="url"
            placeholder="X (Twitter) URL"
            value={form.social_x || ''}
            onChange={(e) => setVal('social_x', e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-semibold cursor-pointer"
      >
        <Save className="w-4 h-4" />
        <span>{saving ? 'Saving...' : 'Save Global Settings'}</span>
      </button>
    </form>
  );
}

// 13. ADMIN ACCOUNT TAB
export function AdminAccountTab({
  admin,
  onReload,
  onNotify,
}: {
  admin: any;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [fullName, setFullName] = useState(admin?.full_name || '');
  const [email, setEmail] = useState(admin?.email || '');
  const [username, setUsername] = useState(admin?.username || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await adminFetch('/api/admin/account', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fullName, email, username, currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Could not update account');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    await onReload();
    onNotify('Admin account updated');
  };

  return (
    <form onSubmit={handleSave} className="bg-white rounded-xl border border-neutral-200 p-6 max-w-xl space-y-4">
      <h3 className="text-base font-semibold text-neutral-900">Administrator Profile & Password</h3>
      {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs">{error}</div>}
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Full Name</label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Email</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm" />
      </div>
      <div>
        <label className="block text-xs font-medium text-neutral-700 mb-1">Username</label>
        <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm" />
      </div>
      <div className="pt-3 border-t border-neutral-200 space-y-3">
        <p className="text-xs font-semibold text-neutral-700">Change Password (Optional)</p>
        <input
          type="password"
          placeholder="Current password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
        />
        <input
          type="password"
          placeholder="New password (min 8 characters)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-neutral-300 text-sm"
        />
      </div>
      <button type="submit" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-semibold cursor-pointer">
        <Save className="w-4 h-4" />
        <span>Update Account</span>
      </button>
    </form>
  );
}
