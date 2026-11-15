import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  FileSpreadsheet,
  MessageSquareQuote,
  Image as ImageIcon,
  Truck,
  LayoutTemplate,
  FileText,
  Menu as MenuIcon,
  Mail,
  Search,
  ToggleRight,
  Settings,
  UserCog,
  LogOut,
  ExternalLink,
  X,
  BarChart3,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext.tsx';
import { Link, useRouter } from '../../lib/router.tsx';
import { adminFetch, clearAdminToken } from '../../lib/adminFetch.ts';
import { AdminVisitorsTab } from './AdminVisitorsTab.tsx';
import { AdminProductsTab } from './AdminProductsTab.tsx';
import {
  AdminCategoriesTab,
  AdminOrdersTab,
  AdminBulkQuotesTab,
  AdminTestimonialsTab,
  AdminMediaTab,
  AdminDeliveryTab,
} from './AdminOperationsTabs.tsx';
import {
  AdminHomepageTab,
  AdminFeaturesTab,
  AdminPagesTab,
  AdminNavigationTab,
  AdminContactsTab,
  AdminSettingsTab,
  AdminAccountTab,
} from './AdminCmsTabs.tsx';

type TabKey =
  | 'overview'
  | 'visitors'
  | 'products'
  | 'categories'
  | 'orders'
  | 'bulk-quotes'
  | 'testimonials'
  | 'media'
  | 'delivery'
  | 'homepage'
  | 'pages'
  | 'navigation'
  | 'contacts'
  | 'seo'
  | 'features'
  | 'settings'
  | 'account';

const NAV_ITEMS: Array<{ key: TabKey; label: string; icon: any }> = [
  { key: 'overview', label: 'Overview', icon: LayoutDashboard },
  { key: 'visitors', label: 'Visitors & Traffic', icon: BarChart3 },
  { key: 'products', label: 'Products', icon: Package },
  { key: 'categories', label: 'Categories', icon: FolderTree },
  { key: 'orders', label: 'Orders & Enquiries', icon: ShoppingCart },
  { key: 'bulk-quotes', label: 'Bulk Quotations', icon: FileSpreadsheet },
  { key: 'testimonials', label: 'Testimonials', icon: MessageSquareQuote },
  { key: 'media', label: 'Media Library', icon: ImageIcon },
  { key: 'delivery', label: 'Delivery Management', icon: Truck },
  { key: 'homepage', label: 'Homepage Editor', icon: LayoutTemplate },
  { key: 'pages', label: 'Website Pages', icon: FileText },
  { key: 'navigation', label: 'Navigation', icon: MenuIcon },
  { key: 'contacts', label: 'Contact Messages', icon: Mail },
  { key: 'seo', label: 'SEO Settings', icon: Search },
  { key: 'features', label: 'Feature Controls', icon: ToggleRight },
  { key: 'settings', label: 'Global Settings', icon: Settings },
  { key: 'account', label: 'Admin Account', icon: UserCog },
];

export function AdminDashboardPage() {
  const { navigate } = useRouter();
  const { refreshStorefront, showToast } = useStore();

  const [tab, setTab] = useState<TabKey>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authChecking, setAuthChecking] = useState(true);
  const [adminUser, setAdminUser] = useState<any>(null);

  const [overview, setOverview] = useState<any>(null);
  const [visitorData, setVisitorData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [bulkQuotes, setBulkQuotes] = useState<any[]>([]);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [mediaAssets, setMediaAssets] = useState<any[]>([]);
  const [deliveryData, setDeliveryData] = useState<{ zones: any[]; settings: any }>({ zones: [], settings: null });
  const [homepageSections, setHomepageSections] = useState<any[]>([]);
  const [websitePages, setWebsitePages] = useState<any[]>([]);
  const [navItems, setNavItems] = useState<any[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<Record<string, string>>({});

  const loadAll = useCallback(async () => {
    const meRes = await adminFetch('/api/admin/me');
    if (!meRes.ok) {
      clearAdminToken();
      navigate('/admin/login');
      return;
    }
    const meData = await meRes.json();
    setAdminUser(meData.admin);
    setAuthChecking(false);

    const safeJson = async (url: string) => {
      const r = await adminFetch(url);
      if (r.status === 401) {
        clearAdminToken();
        navigate('/admin/login');
        throw new Error('Unauthorized');
      }
      return r.ok ? r.json() : {};
    };

    const [
      ovRes,
      prodRes,
      catRes,
      ordRes,
      bqRes,
      testRes,
      medRes,
      delRes,
      hpRes,
      pgRes,
      navRes,
      msgRes,
      setRes,
      visRes,
    ] = await Promise.all([
      safeJson('/api/admin/overview'),
      safeJson('/api/admin/products'),
      safeJson('/api/admin/categories'),
      safeJson('/api/admin/orders'),
      safeJson('/api/admin/bulk-quotes'),
      safeJson('/api/admin/testimonials'),
      safeJson('/api/admin/media'),
      safeJson('/api/admin/delivery'),
      safeJson('/api/admin/homepage'),
      safeJson('/api/admin/pages'),
      safeJson('/api/admin/navigation'),
      safeJson('/api/admin/contacts'),
      safeJson('/api/admin/settings'),
      safeJson('/api/admin/visitors'),
    ]);

    setOverview(ovRes);
    setVisitorData(visRes);
    setProducts(prodRes.products || []);
    setCategories(catRes.categories || []);
    setOrders(ordRes.orders || []);
    setBulkQuotes(bqRes.quotes || []);
    setTestimonials(testRes.testimonials || []);
    setMediaAssets(medRes.assets || []);
    setDeliveryData({ zones: delRes.zones || [], settings: delRes.settings });
    setHomepageSections(hpRes.sections || []);
    setWebsitePages(pgRes.pages || []);
    setNavItems(navRes.items || []);
    setContactMessages(msgRes.messages || []);
    setGlobalSettings(setRes.settings || {});
    refreshStorefront().catch(() => {});
  }, [navigate, refreshStorefront]);

  useEffect(() => {
    loadAll().catch((err) => {
      if (err instanceof Error && err.message === 'Unauthorized') {
        navigate('/admin/login');
      } else {
        setAuthChecking(false);
        showToast('Some dashboard data could not be loaded. Please refresh.');
      }
    });
  }, [loadAll, navigate, showToast]);

  const handleLogout = async () => {
    await adminFetch('/api/admin/logout', { method: 'POST' });
    clearAdminToken();
    navigate('/admin/login');
  };

  if (authChecking) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center text-sm text-neutral-600">
        Verifying administrator session...
      </div>
    );
  }

  const activeNav = NAV_ITEMS.find((n) => n.key === tab);
  const stats = overview?.stats || {};

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar Desktop + Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#25070D] text-[#F4EFE6] flex flex-col transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div>
            <p className="font-display text-lg font-bold text-white">Zobowellness</p>
            <p className="text-[11px] text-[#DFC48C]">Owner Dashboard</p>
          </div>
          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setTab(item.key);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#640B1A] text-white'
                    : 'text-[#E5D7CB] hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/10 space-y-1">
          <Link
            to="/"
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#DFC48C] hover:bg-white/10"
          >
            <ExternalLink className="w-4 h-4" />
            <span>View Live Storefront</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-[#E5D7CB] hover:bg-white/10 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-neutral-200 px-4 sm:px-8 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open dashboard menu"
              className="lg:hidden p-2 rounded-lg border border-neutral-200 text-neutral-700 cursor-pointer"
            >
              <MenuIcon className="w-4 h-4" />
            </button>
            <div>
              <p className="text-xs text-neutral-500">Zobowellness Admin / {activeNav?.label}</p>
              <h1 className="text-lg font-semibold text-neutral-900">{activeNav?.label}</h1>
            </div>
          </div>

          <div className="text-right text-xs">
            <p className="font-medium text-neutral-900">{adminUser?.full_name}</p>
            <p className="text-neutral-500">{adminUser?.email}</p>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <p className="text-xs text-neutral-500">Total Products</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-neutral-900 mt-1">
                    {stats.totalProducts ?? 0}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 tabular-nums">
                    {stats.availableProducts ?? 0} available · {stats.outOfStockProducts ?? 0} out of stock
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <p className="text-xs text-neutral-500">Order Enquiries</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#640B1A] mt-1">
                    {stats.newOrders ?? 0}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 tabular-nums">
                    New enquiries · {stats.pendingOrders ?? 0} pending action
                  </p>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 p-5">
                  <p className="text-xs text-neutral-500">Bulk Quotation Requests</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#2B5B2C] mt-1">
                    {stats.bulkQuotes ?? 0}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 tabular-nums">
                    {stats.newBulkQuotes ?? 0} new · {stats.unreadContacts ?? 0} unread messages
                  </p>
                </div>

                <div
                  onClick={() => setTab('visitors')}
                  className="bg-white rounded-xl border border-neutral-200 p-5 cursor-pointer hover:border-[#640B1A] transition-colors"
                >
                  <p className="text-xs text-neutral-500">Storefront Visitors</p>
                  <p className="text-2xl font-bold font-mono tabular-nums text-[#640B1A] mt-1">
                    {stats.totalPageViews ?? 0}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1 tabular-nums">
                    {stats.todayPageViews ?? 0} views today · {stats.uniqueVisitors ?? 0} unique visitors
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
                  <h2 className="text-sm font-semibold text-neutral-900">Recent Admin Activity</h2>
                </div>
                <div className="divide-y divide-neutral-200">
                  {(overview?.recentLogs || []).length === 0 ? (
                    <p className="p-6 text-sm text-neutral-500">No recorded activity yet.</p>
                  ) : (
                    (overview?.recentLogs || []).map((log: any) => (
                      <div key={log.id} className="px-5 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-mono font-semibold text-[#640B1A]">{log.action}</span>{' '}
                          <span className="text-neutral-700">{log.details || `${log.entity_type} #${log.entity_id}`}</span>
                        </div>
                        <span className="text-neutral-500 font-mono tabular-nums">{log.created_at}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {tab === 'visitors' && (
            <AdminVisitorsTab data={visitorData} onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'products' && (
            <AdminProductsTab
              products={products}
              categories={categories}
              mediaAssets={mediaAssets}
              currency={globalSettings.currency || 'CAD'}
              onReload={loadAll}
              onNotify={showToast}
            />
          )}

          {tab === 'categories' && (
            <AdminCategoriesTab categories={categories} onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'orders' && <AdminOrdersTab orders={orders} onReload={loadAll} onNotify={showToast} />}

          {tab === 'bulk-quotes' && (
            <AdminBulkQuotesTab quotes={bulkQuotes} onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'testimonials' && (
            <AdminTestimonialsTab testimonials={testimonials} onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'media' && <AdminMediaTab assets={mediaAssets} onReload={loadAll} onNotify={showToast} />}

          {tab === 'delivery' && (
            <AdminDeliveryTab
              zones={deliveryData.zones}
              settings={deliveryData.settings}
              currency={globalSettings.currency || 'CAD'}
              onReload={loadAll}
              onNotify={showToast}
            />
          )}

          {tab === 'homepage' && (
            <AdminHomepageTab sections={homepageSections} onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'pages' && <AdminPagesTab pages={websitePages} onReload={loadAll} onNotify={showToast} />}

          {tab === 'navigation' && <AdminNavigationTab items={navItems} onReload={loadAll} onNotify={showToast} />}

          {tab === 'contacts' && <AdminContactsTab messages={contactMessages} onReload={loadAll} />}

          {tab === 'seo' && (
            <AdminSettingsTab settings={globalSettings} mode="seo" onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'features' && (
            <AdminFeaturesTab
              sections={homepageSections}
              settings={globalSettings}
              onReload={loadAll}
              onNotify={showToast}
            />
          )}

          {tab === 'settings' && (
            <AdminSettingsTab settings={globalSettings} mode="global" onReload={loadAll} onNotify={showToast} />
          )}

          {tab === 'account' && <AdminAccountTab admin={adminUser} onReload={loadAll} onNotify={showToast} />}
        </main>
      </div>
    </div>
  );
}
