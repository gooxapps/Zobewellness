import { useState } from 'react';
import { ZoomIn, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ImageWithFallback } from '../components/ImageWithFallback.tsx';

export function TestimonialsPage() {
  const { storefront } = useStore();
  const testimonials = storefront?.testimonials || [];
  const [lightbox, setLightbox] = useState<{ url: string; caption: string } | null>(null);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <div className="max-w-2xl space-y-3">
        <p className="text-sm font-semibold text-[#2B5B2C]">Unedited Customer Conversations</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#640B1A]">
          Customer Testimonials
        </h1>
        <p className="text-base text-[#5A504A]">
          Real WhatsApp screenshots shared by customers after receiving and preparing our cleaned Grade A hibiscus leaves. Click any screenshot to inspect it full-size.
        </p>
      </div>

      {testimonials.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#E5DDD0] p-12 text-center text-sm text-[#5A504A]">
          No customer testimonial screenshots are published at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setLightbox({ url: t.image_url, caption: t.caption })}
              className="group bg-white rounded-xl border border-[#E5DDD0] overflow-hidden text-left transition-all hover:-translate-y-0.5 hover:shadow-md flex flex-col cursor-pointer"
            >
              <div className="aspect-[4/5] bg-[#F4EFE6] overflow-hidden relative">
                <ImageWithFallback
                  src={t.image_url}
                  alt={t.alt_text || 'WhatsApp customer review screenshot'}
                  className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white opacity-90 group-hover:bg-[#640B1A] transition-colors">
                  <ZoomIn className="w-4 h-4" />
                </span>
              </div>
              {t.caption && (
                <div className="p-4 border-t border-[#F0EAE0]">
                  <p className="text-sm font-medium text-[#1E1916]">{t.caption}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightbox(null)}
              aria-label="Close screenshot preview"
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption || 'WhatsApp testimonial screenshot'}
              className="w-full max-h-[82vh] object-contain bg-[#111]"
            />
            {lightbox.caption && (
              <div className="p-4 bg-white border-t border-[#E5DDD0] text-sm text-[#1E1916]">
                {lightbox.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
