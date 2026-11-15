import { useEffect, useState } from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { WebsitePage } from '../types.ts';
import { Link } from '../lib/router.tsx';
import { ImageWithFallback } from '../components/ImageWithFallback.tsx';

export function AboutPage() {
  const [page, setPage] = useState<WebsitePage | null>(null);

  useEffect(() => {
    fetch('/api/pages/about')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.page) {
          setPage(data.page);
          if (data.page.seo_title) document.title = data.page.seo_title;
        }
      })
      .catch(() => {});
  }, []);

  const extra = (() => {
    try {
      return JSON.parse(page?.extra_json || '{}');
    } catch {
      return {};
    }
  })();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-14">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        <div className="lg:col-span-6 space-y-5">
          <p className="text-sm font-semibold text-[#2B5B2C]">
            {page?.hero_subtitle || 'Cleaned Grade A Hibiscus Leaves & Botanical Supply'}
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#640B1A]">
            {page?.hero_title || 'About Zobowellness'}
          </h1>
          <div className="space-y-4 text-base text-[#433A35] leading-relaxed whitespace-pre-line">
            {page?.body ||
              'Zobowellness supplies already-cleaned Grade A hibiscus leaves in bulk along with botanical leaves, herbs, flowers, berries, seeds, and powders.'}
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] transition-colors"
            >
              <span>Explore Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/bulk-quote"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] transition-colors"
            >
              <span>Bulk Supply Enquiry</span>
            </Link>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl overflow-hidden border border-[#E5DDD0] shadow-md aspect-[4/3] bg-[#F4EFE6]">
            <ImageWithFallback
              src={page?.image_url || '/assets/botanical/about-infusion.jpg'}
              alt="Steeped Grade A hibiscus tea and botanical petals"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {Array.isArray(extra.pillars) && extra.pillars.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {extra.pillars.map((p: any, idx: number) => (
            <div key={idx} className="bg-white rounded-xl border border-[#E5DDD0] p-6 space-y-2">
              <h2 className="font-display text-xl font-bold text-[#640B1A]">{p.title}</h2>
              <p className="text-sm text-[#5A504A] leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(extra.targetCustomers) && extra.targetCustomers.length > 0 && (
        <div className="bg-[#F4EFE6] rounded-2xl border border-[#E5DDD0] p-8 space-y-5">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#1E1916]">
            Who Zobowellness Supplies
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {extra.targetCustomers.map((cust: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3 bg-white rounded-lg border border-[#E5DDD0] p-4 text-sm font-medium text-[#1E1916]">
                <Check className="w-4 h-4 text-[#2B5B2C] shrink-0" />
                <span>{cust}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
