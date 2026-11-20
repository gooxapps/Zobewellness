import { useEffect, useRef } from 'react';
import { StoreProvider, useStore } from './context/StoreContext.tsx';
import { RouterProvider, useRouter, Link } from './lib/router.tsx';
import { trackEvent } from './lib/tracker.ts';
import { trackMetaPageView } from './lib/metaPixel.ts';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { MobileBottomNav } from './components/MobileBottomNav.tsx';
import { OfflineIndicator } from './components/PWAInstallButton.tsx';
import { WhatsAppFloatingButton } from './components/WhatsAppFloatingButton.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { ShopPage } from './pages/ShopPage.tsx';
import { ProductDetailPage } from './pages/ProductDetailPage.tsx';
import { AboutPage } from './pages/AboutPage.tsx';
import { BulkQuotePage } from './pages/BulkQuotePage.tsx';
import { TestimonialsPage } from './pages/TestimonialsPage.tsx';
import { DeliveryPage } from './pages/DeliveryPage.tsx';
import { ContactPage } from './pages/ContactPage.tsx';
import { AdminLoginPage } from './pages/admin/AdminLoginPage.tsx';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage.tsx';

function AppShell() {
  const { path } = useRouter();
  const { storefront, loading, error, toast } = useStore();

  const settings = storefront?.settings || {};
  const isFirstRouteRef = useRef(true);

  useEffect(() => {
    if (!path.startsWith('/admin')) {
      trackEvent({ eventType: 'page_view', pagePath: path || '/' });
      if (isFirstRouteRef.current) {
        isFirstRouteRef.current = false;
      } else {
        trackMetaPageView(settings.meta_pixel_id);
      }
    }
  }, [path, settings.meta_pixel_id]);

  useEffect(() => {
    if (settings.seo_default_title && !path.startsWith('/product/')) {
      document.title = settings.seo_default_title;
    }
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && settings.seo_default_description) {
      metaDesc.setAttribute('content', settings.seo_default_description);
    }
  }, [path, settings.seo_default_title, settings.seo_default_description]);

  // Admin Routes render outside customer storefront shell
  if (path === '/admin/login') {
    return (
      <>
        <AdminLoginPage onLoginSuccess={() => {}} />
        <ToastBanner toast={toast} />
      </>
    );
  }

  if (path.startsWith('/admin')) {
    return (
      <>
        <AdminDashboardPage />
        <ToastBanner toast={toast} />
      </>
    );
  }

  // Maintenance mode gate for public visitors (admin link remains accessible)
  if (!loading && settings.maintenance_mode === 'true') {
    return (
      <div className="min-h-screen bg-[#FBF8F3] flex items-center justify-center p-6">
        <div className="max-w-lg w-full bg-white rounded-2xl border border-[#E5DDD0] p-8 text-center space-y-4 shadow-sm">
          <h1 className="font-display text-3xl font-bold text-[#640B1A]">
            {settings.business_name || 'Zobowellness'}
          </h1>
          <p className="text-sm text-[#5A504A]">
            {settings.maintenance_message || 'We are updating our botanical inventory. Please contact us on WhatsApp for immediate orders.'}
          </p>
          <div className="pt-2 flex flex-col sm:flex-row justify-center gap-3">
            <a
              href={`https://wa.me/${(settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold"
            >
              Chat on WhatsApp
            </a>
            <Link to="/admin/login" className="px-5 py-2.5 rounded-lg border border-[#D8CEC0] text-sm font-medium text-[#3B332E]">
              Owner Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const renderPage = () => {
    if (loading && !storefront) {
      return (
        <div className="max-w-7xl mx-auto px-4 py-16 space-y-6">
          <div className="h-72 bg-white rounded-2xl border border-[#E5DDD0] animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="h-64 bg-white rounded-xl border border-[#E5DDD0] animate-pulse" />
            <div className="h-64 bg-white rounded-xl border border-[#E5DDD0] animate-pulse" />
            <div className="h-64 bg-white rounded-xl border border-[#E5DDD0] animate-pulse" />
          </div>
        </div>
      );
    }

    if (error && !storefront) {
      return (
        <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-3">
          <h1 className="font-display text-2xl font-bold text-[#640B1A]">Unable to Load Storefront</h1>
          <p className="text-sm text-[#5A504A]">{error}</p>
        </div>
      );
    }

    if (path === '/' || path === '') return <HomePage />;
    if (path === '/shop') return <ShopPage />;
    if (path.startsWith('/product/')) {
      const slug = path.replace('/product/', '').split('/')[0];
      return <ProductDetailPage slug={slug} />;
    }
    if (path === '/about') return <AboutPage />;
    if (path === '/bulk-quote') return <BulkQuotePage />;
    if (path === '/testimonials') return <TestimonialsPage />;
    if (path === '/delivery') return <DeliveryPage />;
    if (path === '/contact') return <ContactPage />;

    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h1 className="font-display text-3xl font-bold text-[#640B1A]">Page Not Found</h1>
        <p className="text-sm text-[#5A504A]">The page you requested could not be found.</p>
        <Link to="/" className="inline-block px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-semibold">
          Return Home
        </Link>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF8F3] text-[#1E1916] pb-16 lg:pb-0">
      <Navbar />
      <main className="flex-1">{renderPage()}</main>
      <Footer />
      <MobileBottomNav />
      <CartDrawer />
      <WhatsAppFloatingButton />
      <OfflineIndicator />
      <ToastBanner toast={toast} hasFloatingWidget />
    </div>
  );
}

function ToastBanner({
  toast,
  hasFloatingWidget = false,
}: {
  toast: string | null;
  hasFloatingWidget?: boolean;
}) {
  if (!toast) return null;
  return (
    <div
      role="status"
      className={`fixed right-4 sm:right-5 z-50 bg-[#1E1916] text-white px-4 py-3 rounded-xl shadow-lg text-sm font-medium border border-white/10 ${
        hasFloatingWidget ? 'bottom-36 lg:bottom-24' : 'bottom-5'
      }`}
    >
      {toast}
    </div>
  );
}

export default function App() {
  return (
    <RouterProvider>
      <StoreProvider>
        <AppShell />
      </StoreProvider>
    </RouterProvider>
  );
}
