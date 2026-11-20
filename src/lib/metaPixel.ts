declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    _zoboPixelInited?: Set<string>;
  }
}

export const DEFAULT_META_PIXEL_ID = '2129321331271351';

export function ensureMetaPixelInitialized(pixelId?: string): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  const id = (pixelId || DEFAULT_META_PIXEL_ID).trim();
  if (!id || window.location.pathname.startsWith('/admin')) return;
  if (!window._zoboPixelInited) {
    window._zoboPixelInited = new Set([DEFAULT_META_PIXEL_ID]);
  }
  if (!window._zoboPixelInited.has(id)) {
    window.fbq('init', id);
    window._zoboPixelInited.add(id);
  }
}

export function trackMetaPageView(pixelId?: string): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (window.location.pathname.startsWith('/admin')) return;
  ensureMetaPixelInitialized(pixelId);
  window.fbq('track', 'PageView');
}

export function trackMetaEvent(eventName: string, params?: Record<string, any>): void {
  if (typeof window === 'undefined' || !window.fbq) return;
  if (window.location.pathname.startsWith('/admin')) return;
  if (params) {
    const cleanParams: Record<string, any> = {};
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        cleanParams[k] = v;
      }
    }
    window.fbq('track', eventName, cleanParams);
  } else {
    window.fbq('track', eventName);
  }
}
