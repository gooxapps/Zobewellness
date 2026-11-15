import { useEffect } from 'react';

const VISITOR_KEY = 'zobo_visitor_uid';

function getClientVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = `v_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

export function trackEvent(params: {
  eventType: 'page_view' | 'section_view' | 'action';
  pagePath: string;
  sectionName?: string;
  productName?: string;
}): void {
  if (params.pagePath.startsWith('/admin')) return;
  try {
    const payload = JSON.stringify({
      ...params,
      referrer: document.referrer || '',
      clientVisitorId: getClientVisitorId(),
    });
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // ignore tracking failures silently
  }
}

export function useSectionTracker(pagePath: string, ready: boolean) {
  useEffect(() => {
    if (!ready || pagePath.startsWith('/admin')) return;
    if (typeof IntersectionObserver === 'undefined') return;

    const seen = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const name = entry.target.getAttribute('data-track-section');
            if (name && !seen.has(name)) {
              seen.add(name);
              trackEvent({
                eventType: 'section_view',
                pagePath,
                sectionName: name,
              });
            }
          }
        }
      },
      { threshold: 0.3 }
    );

    const els = document.querySelectorAll('[data-track-section]');
    els.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [pagePath, ready]);
}
