import { RefreshCw, Trash2, Eye, Users, MonitorSmartphone, MapPin } from 'lucide-react';
import { adminFetch } from '../../lib/adminFetch.ts';

interface VisitorData {
  summary: {
    totalPageViews: number;
    todayPageViews: number;
    uniqueVisitors: number;
    todayUniqueVisitors: number;
  };
  topPages: Array<{ page_path: string; views: number; unique_visitors: number; last_visited: string }>;
  sectionReach: Array<{ section_name: string; views: number; unique_visitors: number }>;
  topProducts: Array<{ product_name: string; views: number; cart_adds: number }>;
  devices: Array<{ device_type: string; visitors: number; views: number }>;
  recentVisits: Array<{
    id: number;
    visitor_id: string;
    event_type: string;
    page_path: string;
    section_name: string;
    product_name: string;
    referrer: string;
    device_type: string;
    location_hint: string;
    created_at: string;
  }>;
}

const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero Banner',
  categories: 'Product Categories',
  featured_products: 'Featured Products',
  promo_banner: 'Promotional Banner',
  about: 'About Zobowellness',
  testimonials: 'Customer Testimonials',
  bulk_quote: 'Bulk Quote Form',
  delivery_info: 'Delivery Info Strip',
  contact: 'Contact Strip',
  add_to_cart: 'Add to Cart Action',
  cart_open: 'Opened Cart Drawer',
};

export function AdminVisitorsTab({
  data,
  onReload,
  onNotify,
}: {
  data: VisitorData | null;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const summary = data?.summary || {
    totalPageViews: 0,
    todayPageViews: 0,
    uniqueVisitors: 0,
    todayUniqueVisitors: 0,
  };
  const topPages = data?.topPages || [];
  const sectionReach = data?.sectionReach || [];
  const topProducts = data?.topProducts || [];
  const devices = data?.devices || [];
  const recentVisits = data?.recentVisits || [];

  const maxSectionViews = Math.max(1, ...sectionReach.map((s) => s.views));

  const handleClear = async () => {
    const res = await adminFetch('/api/admin/visitors', { method: 'DELETE' });
    if (res.ok) {
      await onReload();
      onNotify('Visitor analytics history cleared');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-neutral-600">
          Tracks real customer visits, visited pages, scrolled page sections, and cart interactions. Admin routes are excluded.
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              onReload();
              onNotify('Visitor data refreshed');
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-neutral-300 bg-white text-xs font-medium text-neutral-800 hover:bg-neutral-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-red-200 bg-white text-xs font-medium text-red-700 hover:bg-red-50 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Total Page Views</span>
            <Eye className="w-4 h-4 text-[#640B1A]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
            {summary.totalPageViews}
          </p>
          <p className="text-xs text-neutral-500 mt-1 tabular-nums">{summary.todayPageViews} today</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Unique Visitors</span>
            <Users className="w-4 h-4 text-[#2B5B2C]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1.5">
            {summary.uniqueVisitors}
          </p>
          <p className="text-xs text-neutral-500 mt-1 tabular-nums">{summary.todayUniqueVisitors} today</p>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Devices</span>
            <MonitorSmartphone className="w-4 h-4 text-[#640B1A]" />
          </div>
          <div className="mt-2 space-y-1 text-xs">
            {devices.length === 0 ? (
              <p className="text-neutral-400">No visits yet</p>
            ) : (
              devices.map((d) => (
                <div key={d.device_type} className="flex justify-between">
                  <span className="text-neutral-700">{d.device_type}</span>
                  <span className="font-mono tabular-nums font-medium">{d.views} views</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center justify-between text-xs text-neutral-500">
            <span>Most Viewed Page</span>
            <MapPin className="w-4 h-4 text-[#2B5B2C]" />
          </div>
          <p className="text-sm font-mono font-semibold text-[#640B1A] truncate mt-2">
            {topPages[0]?.page_path || '—'}
          </p>
          <p className="text-xs text-neutral-500 mt-1 tabular-nums">
            {topPages[0] ? `${topPages[0].views} views` : 'Waiting for visits'}
          </p>
        </div>
      </div>

      {/* Pages + Section Reach */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Pages */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900">Pages Visited</h3>
          </div>
          {topPages.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">No page views recorded yet.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-neutral-200 text-neutral-500">
                <tr>
                  <th className="py-2.5 px-4">Page URL</th>
                  <th className="py-2.5 px-4 text-right">Views</th>
                  <th className="py-2.5 px-4 text-right">Visitors</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {topPages.map((p) => (
                  <tr key={p.page_path}>
                    <td className="py-2.5 px-4 font-mono text-neutral-900">{p.page_path}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums font-medium">{p.views}</td>
                    <td className="py-2.5 px-4 text-right font-mono tabular-nums text-neutral-600">{p.unique_visitors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Where Visitors Look on the Page */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900">Where Visitors Viewed on the Page</h3>
          </div>
          {sectionReach.length === 0 ? (
            <p className="p-6 text-sm text-neutral-500">No section scroll events recorded yet.</p>
          ) : (
            <div className="p-5 space-y-3">
              {sectionReach.map((s) => {
                const pct = Math.round((s.views / maxSectionViews) * 100);
                return (
                  <div key={s.section_name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-neutral-800">
                        {SECTION_LABELS[s.section_name] || s.section_name}
                      </span>
                      <span className="font-mono tabular-nums text-neutral-600">
                        {s.views} views ({s.unique_visitors} visitors)
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#640B1A] rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Product Interest */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
            <h3 className="text-sm font-semibold text-neutral-900">Product Views & Cart Adds</h3>
          </div>
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="py-2.5 px-4">Product</th>
                <th className="py-2.5 px-4 text-right">Detail Page Views</th>
                <th className="py-2.5 px-4 text-right">Added to Cart</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {topProducts.map((tp) => (
                <tr key={tp.product_name}>
                  <td className="py-2.5 px-4 font-medium text-neutral-900">{tp.product_name}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">{tp.views}</td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums text-[#2B5B2C] font-semibold">
                    {tp.cart_adds}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Live Recent Visitor Log */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-x-auto">
        <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
          <h3 className="text-sm font-semibold text-neutral-900">Recent Visitor Activity</h3>
        </div>
        {recentVisits.length === 0 ? (
          <p className="p-6 text-sm text-neutral-500">No visitor activity recorded yet.</p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-neutral-200 text-neutral-500">
              <tr>
                <th className="py-2.5 px-4">Time (UTC)</th>
                <th className="py-2.5 px-4">Visitor</th>
                <th className="py-2.5 px-4">Device</th>
                <th className="py-2.5 px-4">Page</th>
                <th className="py-2.5 px-4">Section / Action</th>
                <th className="py-2.5 px-4">Referrer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentVisits.map((v) => (
                <tr key={v.id} className="hover:bg-neutral-50">
                  <td className="py-2 px-4 font-mono tabular-nums text-neutral-500 whitespace-nowrap">
                    {v.created_at}
                  </td>
                  <td className="py-2 px-4 font-mono text-neutral-700">
                    {v.visitor_id.slice(0, 10)}
                    {v.location_hint ? ` (${v.location_hint})` : ''}
                  </td>
                  <td className="py-2 px-4 text-neutral-700">{v.device_type}</td>
                  <td className="py-2 px-4 font-mono text-[#640B1A]">{v.page_path}</td>
                  <td className="py-2 px-4 text-neutral-800">
                    {v.section_name ? SECTION_LABELS[v.section_name] || v.section_name : 'Page Visit'}
                    {v.product_name ? ` — ${v.product_name}` : ''}
                  </td>
                  <td className="py-2 px-4 text-neutral-500 truncate max-w-[180px]">
                    {v.referrer || 'Direct'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
