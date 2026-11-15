import { useState } from 'react';
import {
  Home,
  Leaf,
  PackageCheck,
  ShoppingBag,
  Menu,
  X,
  MessageCircle,
  Search,
  ChevronRight,
} from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { Link, useRouter } from '../lib/router.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function MobileBottomNav() {
  const { storefront, cartCount, setCartOpen } = useStore();
  const { path, navigate } = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const settings = storefront?.settings || {};
  const whatsappClean = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');
  const headerLinks = (storefront?.navigation || []).filter((n) => n.location === 'header');
  const categories = storefront?.categories || [];

  const isHome = path === '/' || path === '';
  const isShop = path === '/shop' || path.startsWith('/product/');
  const isBulk = path === '/bulk-quote';

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm('');
      setMenuOpen(false);
    }
  };

  return (
    <>
      {/* Slide-up Mobile Menu Sheet */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex flex-col justify-end">
          <div
            className="fixed inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-label="Mobile navigation menu"
            className="relative z-10 bg-[#FBF8F3] border-t border-[#E5DDD0] rounded-t-2xl shadow-2xl max-h-[82vh] overflow-y-auto px-4 pt-4 pb-24 space-y-5"
          >
            <div className="flex items-center justify-between border-b border-[#E5DDD0] pb-3">
              <div>
                <p className="font-display text-lg font-bold text-[#640B1A]">
                  {settings.business_name || 'Zobowellness'}
                </p>
                <p className="text-xs text-[#5A504A]">Browse pages &amp; botanical categories</p>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close mobile menu"
                className="p-2 rounded-lg text-[#3B332E] hover:bg-[#F4EFE6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Search */}
            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#7B6E65] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search botanicals..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] cursor-pointer"
              >
                Go
              </button>
            </form>

            {/* Primary Navigation Links */}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B6E65] mb-2">
                Menu
              </p>
              <div className="grid grid-cols-1 gap-1">
                {headerLinks.map((item) => {
                  const active = path === item.href;
                  return (
                    <Link
                      key={item.id}
                      to={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? 'bg-[#640B1A] text-white'
                          : 'bg-white border border-[#E5DDD0] text-[#1E1916] hover:bg-[#F4EFE6]'
                      }`}
                    >
                      <span>{item.label}</span>
                      <ChevronRight className={`w-4 h-4 ${active ? 'text-white/80' : 'text-[#7B6E65]'}`} />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Categories Quick Jump */}
            {categories.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#7B6E65] mb-2">
                  Product Categories
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((cat) => (
                    <Link
                      key={cat.id}
                      to={`/shop?category=${encodeURIComponent(cat.slug)}`}
                      onClick={() => setMenuOpen(false)}
                      className="px-3 py-2 rounded-lg bg-white border border-[#E5DDD0] text-xs font-medium text-[#3B332E] hover:border-[#640B1A] hover:text-[#640B1A] truncate"
                    >
                      {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Direct WhatsApp CTA & Install App */}
            <div className="space-y-2.5">
              <PWAInstallButton variant="menu" onAction={() => setMenuOpen(false)} />
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat on WhatsApp ({settings.whatsapp_number || '+15875453110'})</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fixed Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#FBF8F3]/95 backdrop-blur-md border-t border-[#E5DDD0] shadow-[0_-4px_20px_rgba(30,25,22,0.08)] pb-[env(safe-area-inset-bottom)]"
      >
        <div className="grid grid-cols-5 h-16 max-w-lg mx-auto">
          <Link
            to="/"
            onClick={() => setMenuOpen(false)}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isHome && !menuOpen ? 'text-[#640B1A] font-semibold' : 'text-[#5A504A] hover:text-[#640B1A]'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </Link>

          <Link
            to="/shop"
            onClick={() => setMenuOpen(false)}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isShop && !menuOpen ? 'text-[#640B1A] font-semibold' : 'text-[#5A504A] hover:text-[#640B1A]'
            }`}
          >
            <Leaf className="w-5 h-5" />
            <span>Shop</span>
          </Link>

          <Link
            to="/bulk-quote"
            onClick={() => setMenuOpen(false)}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors ${
              isBulk && !menuOpen ? 'text-[#640B1A] font-semibold' : 'text-[#5A504A] hover:text-[#640B1A]'
            }`}
          >
            <PackageCheck className="w-5 h-5" />
            <span>Bulk</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              setMenuOpen(false);
              setCartOpen(true);
            }}
            aria-label={`Open shopping cart (${cartCount} items)`}
            className="relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium text-[#5A504A] hover:text-[#640B1A] transition-colors cursor-pointer"
          >
            <div className="relative">
              <ShoppingBag className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#640B1A] text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span>Cart</span>
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className={`flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors cursor-pointer ${
              menuOpen ? 'text-[#640B1A] font-semibold' : 'text-[#5A504A] hover:text-[#640B1A]'
            }`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            <span>Menu</span>
          </button>
        </div>
      </nav>
    </>
  );
}
