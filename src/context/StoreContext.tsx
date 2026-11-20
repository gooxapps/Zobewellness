import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CartItem, HomepageSection, Product, ProductVariant, StorefrontData } from '../types.ts';
import { trackEvent } from '../lib/tracker.ts';
import { trackMetaEvent } from '../lib/metaPixel.ts';

interface StoreContextValue {
  storefront: StorefrontData | null;
  loading: boolean;
  error: string | null;
  refreshStorefront: () => Promise<void>;
  getSection: (key: string) => HomepageSection | undefined;
  isSectionEnabled: (key: string) => boolean;
  currency: string;
  formatMoney: (amount: number | null | undefined) => string;
  getEffectivePrice: (variant: ProductVariant) => number | null;
  cart: CartItem[];
  cartCount: number;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  addToCart: (product: Product, variant: ProductVariant, quantity?: number) => void;
  updateCartQty: (variantId: number, quantity: number) => void;
  removeFromCart: (variantId: number) => void;
  clearCart: () => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_STORAGE_KEY = 'zobowellness_cart_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [storefront, setStorefront] = useState<StorefrontData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cartOpen, setCartOpenState] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const setCartOpen = useCallback((open: boolean) => {
    setCartOpenState(open);
    if (open) {
      trackEvent({
        eventType: 'action',
        pagePath: window.location.pathname || '/',
        sectionName: 'cart_open',
      });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  }, []);

  const refreshStorefront = useCallback(async () => {
    try {
      const res = await fetch('/api/storefront');
      if (!res.ok) throw new Error('Failed to load storefront data.');
      const data = (await res.json()) as StorefrontData;
      setStorefront(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStorefront();
  }, [refreshStorefront]);

  const currency = storefront?.settings?.currency || 'CAD';

  const getSection = useCallback(
    (key: string) => storefront?.sections.find((s) => s.section_key === key),
    [storefront]
  );

  const isSectionEnabled = useCallback(
    (key: string) => {
      const sec = storefront?.sections.find((s) => s.section_key === key);
      return sec ? sec.is_enabled === 1 : true;
    },
    [storefront]
  );

  const formatMoney = useCallback(
    (amount: number | null | undefined) => {
      if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
        return 'Price on enquiry';
      }
      return `${currency} $${Number(amount).toLocaleString('en-CA', {
        minimumFractionDigits: Number(amount) % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2,
      })}`;
    },
    [currency]
  );

  const getEffectivePrice = useCallback((variant: ProductVariant): number | null => {
    if (variant.promo_price !== null && variant.promo_price !== undefined) {
      return Number(variant.promo_price);
    }
    if (variant.price !== null && variant.price !== undefined) {
      return Number(variant.price);
    }
    return null;
  }, []);

  const addToCart = useCallback(
    (product: Product, variant: ProductVariant, quantity = 1) => {
      const unitPrice = getEffectivePrice(variant);
      const imageUrl = product.images?.[0]?.image_url || '/assets/botanical/hero-hibiscus.jpg';
      trackEvent({
        eventType: 'action',
        pagePath: window.location.pathname || '/',
        sectionName: 'add_to_cart',
        productName: product.name,
      });
      trackMetaEvent('AddToCart', {
        content_name: product.name,
        content_ids: [String(product.id)],
        content_type: 'product',
        currency,
        value: unitPrice !== null ? Number((unitPrice * quantity).toFixed(2)) : undefined,
      });
      setCart((prev) => {
        const existing = prev.find((i) => i.variantId === variant.id);
        if (existing) {
          return prev.map((i) =>
            i.variantId === variant.id
              ? { ...i, quantity: i.quantity + quantity, unitPrice }
              : i
          );
        }
        return [
          ...prev,
          {
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            imageUrl,
            variantId: variant.id,
            packagingSize: variant.packaging_size,
            unitPrice,
            quantity,
          },
        ];
      });
      showToast(`Added ${product.name} (${variant.packaging_size}) to cart`);
    },
    [currency, getEffectivePrice, showToast]
  );

  const updateCartQty = useCallback((variantId: number, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.variantId !== variantId));
      return;
    }
    setCart((prev) => prev.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)));
  }, []);

  const removeFromCart = useCallback((variantId: number) => {
    setCart((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  return (
    <StoreContext.Provider
      value={{
        storefront,
        loading,
        error,
        refreshStorefront,
        getSection,
        isSectionEnabled,
        currency,
        formatMoney,
        getEffectivePrice,
        cart,
        cartCount,
        cartOpen,
        setCartOpen,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        toast,
        showToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
