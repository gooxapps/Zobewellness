import { useState } from 'react';
import { Menu, Search, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { Link, useRouter } from '../lib/router.tsx';
import { ImageWithFallback } from './ImageWithFallback.tsx';
import { PWAInstallButton } from './PWAInstallButton.tsx';

export function Navbar() {
  const { storefront, getSection, isSectionEnabled, cartCount, setCartOpen } = useStore();
  const { path, navigate } = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const settings = storefront?.settings || {};
  const announcement = getSection('announcement_bar');
  const showAnnouncement = isSectionEnabled('announcement_bar');
  const navLinks = (storefront?.navigation || []).filter((n) => n.location === 'header');
  const visibleNavLinks = navLinks.slice(0, 6);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchOpen(false);
      setMobileOpen(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FBF8F3]/95 backdrop-blur-md border-b border-[#E5DDD0]">
      {showAnnouncement && announcement && (
        <div className="bg-[#640B1A] text-white text-xs py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <p className="truncate font-medium">
              {announcement.title || settings.announcement_text}
            </p>
            <p className="hidden md:block whitespace-nowrap shrink-0 text-[#F4EFE6]/90">
              {announcement.subtitle}
            </p>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3 sm:gap-8">
        {/* Brand Zone */}
        <Link to="/" className="flex items-center gap-2.5 sm:gap-3 whitespace-nowrap shrink-0 group">
          <ImageWithFallback
            src={settings.light_logo_url || '/assets/aistudio/IMG-20261103-WA0016_9bc2fb38.jpg'}
            alt={settings.business_name || 'Zobowellness'}
            className="h-10 w-10 sm:h-11 sm:w-11 rounded-md object-cover border border-[#E5DDD0]"
          />
          <span className="font-display text-lg sm:text-2xl font-bold tracking-tight text-[#640B1A]">
            {settings.business_name || 'Zobowellness'}
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-6" aria-label="Primary Navigation">
          {visibleNavLinks.map((item) => {
            const active = path === item.href;
            return (
              <Link
                key={item.id}
                to={item.href}
                className={`text-sm font-medium whitespace-nowrap shrink-0 transition-colors pb-0.5 ${
                  active
                    ? 'text-[#640B1A] border-b-2 border-[#640B1A]'
                    : 'text-[#3B332E] hover:text-[#640B1A]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Action Zone */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="hidden sm:block">
            <PWAInstallButton variant="compact" />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            aria-label="Search botanical products"
            className="p-2 sm:p-2.5 rounded-lg text-[#3B332E] hover:bg-[#F4EFE6] hover:text-[#640B1A] transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping cart (${cartCount} items)`}
            className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg bg-[#640B1A] text-white text-sm font-medium hover:bg-[#4A0712] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="hidden sm:inline">Cart</span>
            <span className="tabular-nums font-mono text-xs bg-white/15 px-1.5 py-0.5 rounded">
              {cartCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden p-2.5 rounded-lg text-[#3B332E] hover:bg-[#F4EFE6] cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-[#E5DDD0] bg-white px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex gap-2">
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search hibiscus leaves, moringa, chamomile, seeds, powders..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
              autoFocus
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#2B5B2C] text-white text-sm font-medium hover:bg-[#1F4520] transition-colors whitespace-nowrap cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="lg:hidden border-t border-[#E5DDD0] bg-[#FBF8F3] px-4 py-4 space-y-1">
          {navLinks.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2.5 rounded-lg text-sm font-medium ${
                path === item.href
                  ? 'bg-[#640B1A] text-white'
                  : 'text-[#1E1916] hover:bg-[#F4EFE6]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-2">
            <PWAInstallButton variant="menu" onAction={() => setMobileOpen(false)} />
          </div>
        </div>
      )}
    </header>
  );
}
