import { useState } from 'react';
import { ArrowRight, Check, MessageCircle, Mail, Truck, ShieldCheck, ZoomIn, X } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { Link } from '../lib/router.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { BulkQuoteForm } from '../components/BulkQuoteForm.tsx';
import { ImageWithFallback } from '../components/ImageWithFallback.tsx';
import { useSectionTracker } from '../lib/tracker.ts';

export function HomePage() {
  const { storefront, getSection, isSectionEnabled } = useStore();
  const [lightboxImg, setLightboxImg] = useState<{ url: string; caption: string } | null>(null);
  useSectionTracker('/', Boolean(storefront));

  if (!storefront) return null;

  const settings = storefront.settings;
  const hero = getSection('hero');
  const categoriesSec = getSection('categories');
  const featuredSec = getSection('featured_products');
  const promoSec = getSection('promo_banner');
  const aboutSec = getSection('about');
  const testimonialsSec = getSection('testimonials');
  const bulkSec = getSection('bulk_quote');
  const deliverySec = getSection('delivery_info');
  const contactSec = getSection('contact');

  const heroExtra = (() => {
    try {
      return JSON.parse(hero?.extra_json || '{}');
    } catch {
      return {};
    }
  })();

  const aboutExtra = (() => {
    try {
      return JSON.parse(aboutSec?.extra_json || '{}');
    } catch {
      return {};
    }
  })();

  const whatsappClean = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

  return (
    <div className="space-y-0">
      {/* 1. HERO SECTION */}
      {isSectionEnabled('hero') && hero && (
        <section data-track-section="hero" className="relative bg-gradient-to-br from-[#FBF8F3] via-[#F7F1E6] to-[#EFE5D5] border-b border-[#E5DDD0] overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                {hero.subtitle && (
                  <p className="font-display italic text-xl sm:text-2xl text-[#2B5B2C] font-medium">
                    {hero.subtitle}
                  </p>
                )}
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-bold leading-[1.12] text-[#640B1A]">
                  {hero.title}
                </h1>
                <p className="text-base sm:text-lg text-[#433A35] leading-relaxed max-w-xl">
                  {hero.body}
                </p>

                {Array.isArray(heroExtra.highlights) && heroExtra.highlights.length > 0 && (
                  <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-[#1E1916]">
                    {heroExtra.highlights.map((item: string, idx: number) => (
                      <li key={idx} className="inline-flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#2B5B2C]/15 text-[#2B5B2C] inline-flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap items-center gap-3.5 pt-2">
                  <Link
                    to="/shop"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#640B1A] text-white font-semibold text-sm hover:bg-[#4A0712] transition-colors shadow-sm"
                  >
                    <span>{hero.cta_primary_label || 'Shop Products'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/bulk-quote"
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg bg-[#2B5B2C] text-white font-semibold text-sm hover:bg-[#1F4520] transition-colors shadow-sm"
                  >
                    <span>{hero.cta_secondary_label || 'Request Bulk Quote'}</span>
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="relative rounded-2xl overflow-hidden border border-[#DFD4C3] shadow-lg aspect-[16/11] bg-[#EFE5D5]">
                  <ImageWithFallback
                    src={hero.image_url || '/assets/botanical/hero-hibiscus.jpg'}
                    alt="Cleaned Grade A Hibiscus Leaves in wooden bowl"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-4 left-4 right-4 sm:left-auto sm:right-5 sm:max-w-xs bg-[#640B1A]/95 text-white px-4 py-3 rounded-xl border border-white/15 backdrop-blur-xs">
                    <p className="font-display text-sm font-semibold text-[#DFC48C]">
                      Already Cleaned · Grade A
                    </p>
                    <p className="text-xs text-[#F4EFE6] mt-0.5">
                      Available in 1kg to 100kg packs, or 1,000kg+ wholesale quote.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 2. PRODUCT CATEGORIES */}
      {isSectionEnabled('categories') && storefront.categories.length > 0 && (
        <section data-track-section="categories" className="py-14 lg:py-18 bg-[#FBF8F3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#640B1A]">
                  {categoriesSec?.title || 'Our Product Categories'}
                </h2>
                {categoriesSec?.subtitle && (
                  <p className="text-sm sm:text-base text-[#5A504A] mt-2 max-w-2xl">
                    {categoriesSec.subtitle}
                  </p>
                )}
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#640B1A] hover:underline whitespace-nowrap"
              >
                <span>{categoriesSec?.cta_primary_label || 'View All Products'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {storefront.categories.map((cat) => (
                <Link
                  key={cat.id}
                  to={`/shop?category=${cat.slug}`}
                  className="group rounded-xl overflow-hidden border border-[#E5DDD0] bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col"
                >
                  <div className="aspect-[16/10] bg-[#F4EFE6] overflow-hidden">
                    <ImageWithFallback
                      src={cat.image_url}
                      alt={cat.name}
                      fallbackTitle={cat.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="bg-[#640B1A] text-white px-5 py-3.5 flex items-center justify-between gap-3">
                    <span className="font-semibold text-sm sm:text-base truncate">{cat.name}</span>
                    <ArrowRight className="w-4 h-4 text-[#DFC48C] shrink-0 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 3. FEATURED PRODUCTS */}
      {isSectionEnabled('featured_products') && storefront.featuredProducts.length > 0 && (
        <section data-track-section="featured_products" className="py-14 lg:py-18 bg-white border-y border-[#E5DDD0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
              <div>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#1E1916]">
                  {featuredSec?.title || 'Featured Botanical Supply'}
                </h2>
                {featuredSec?.subtitle && (
                  <p className="text-sm sm:text-base text-[#5A504A] mt-2 max-w-2xl">
                    {featuredSec.subtitle}
                  </p>
                )}
              </div>
              <Link
                to="/shop"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-[#640B1A] text-sm font-semibold text-[#640B1A] hover:bg-[#640B1A] hover:text-white transition-colors whitespace-nowrap"
              >
                <span>{featuredSec?.cta_primary_label || 'Browse Full Catalogue'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {storefront.featuredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 4. PROMOTIONAL BANNER */}
      {isSectionEnabled('promo_banner') && promoSec && (
        <section data-track-section="promo_banner" className="bg-[#2B5B2C] text-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-2xl">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">
                {promoSec.title}
              </h2>
              <p className="text-sm sm:text-base text-[#E6F0E6]">{promoSec.subtitle}</p>
            </div>
            <Link
              to="/bulk-quote"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#C29B40] text-[#1E1916] font-semibold text-sm hover:bg-[#D4AE53] transition-colors whitespace-nowrap shrink-0"
            >
              <span>{promoSec.cta_primary_label || 'Request Wholesale Quote'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 5. ABOUT ZOBOWELLNESS */}
      {isSectionEnabled('about') && aboutSec && (
        <section data-track-section="about" className="py-16 lg:py-20 bg-[#FBF8F3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
              <div className="lg:col-span-6 space-y-5">
                <p className="text-sm font-semibold text-[#2B5B2C]">
                  {aboutSec.subtitle || 'Cleaned Grade A Botanicals Without Compromise'}
                </p>
                <h2 className="font-display text-3xl sm:text-4xl font-bold text-[#640B1A]">
                  {aboutSec.title || 'About Zobowellness'}
                </h2>
                <p className="text-base text-[#433A35] leading-relaxed">{aboutSec.body}</p>

                {Array.isArray(aboutExtra.audience) && aboutExtra.audience.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {aboutExtra.audience.map((aud: string, i: number) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm font-medium text-[#1E1916]">
                        <Check className="w-4 h-4 text-[#2B5B2C] shrink-0" />
                        <span>{aud}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <Link
                    to="/about"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] transition-colors"
                  >
                    <span>{aboutSec.cta_primary_label || 'Learn More'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              <div className="lg:col-span-6">
                <div className="rounded-2xl overflow-hidden border border-[#E5DDD0] shadow-md aspect-[4/3] bg-[#F4EFE6]">
                  <ImageWithFallback
                    src={aboutSec.image_url || '/assets/botanical/about-infusion.jpg'}
                    alt="Prepared ruby hibiscus tea carafe with dried petals"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 6. TESTIMONIALS & BULK QUOTATION SPLIT */}
      {(isSectionEnabled('testimonials') || isSectionEnabled('bulk_quote')) && (
        <section className="py-16 lg:py-20 bg-white border-t border-[#E5DDD0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              {/* Real WhatsApp Testimonials Gallery */}
              {isSectionEnabled('testimonials') && (
                <div data-track-section="testimonials" className={isSectionEnabled('bulk_quote') ? 'lg:col-span-7 space-y-6' : 'lg:col-span-12 space-y-6'}>
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <h2 className="font-display text-3xl font-bold text-[#1E1916]">
                        {testimonialsSec?.title || 'Verified WhatsApp Customer Reviews'}
                      </h2>
                      <p className="text-sm text-[#5A504A] mt-1.5">
                        {testimonialsSec?.subtitle ||
                          'Unedited screenshots sent directly by Zobowellness customers.'}
                      </p>
                    </div>
                    <Link
                      to="/testimonials"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-[#640B1A] hover:underline whitespace-nowrap"
                    >
                      <span>{testimonialsSec?.cta_primary_label || 'View All'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {storefront.testimonials.length === 0 ? (
                    <p className="text-sm text-[#5A504A] py-8 border border-dashed border-[#D8CEC0] rounded-xl text-center">
                      No testimonials published yet.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {storefront.testimonials.slice(0, 6).map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setLightboxImg({ url: t.image_url, caption: t.caption })}
                          className="group relative rounded-xl overflow-hidden border border-[#E5DDD0] bg-[#F4EFE6] aspect-[3/4] text-left cursor-pointer"
                        >
                          <ImageWithFallback
                            src={t.image_url}
                            alt={t.alt_text || 'WhatsApp customer testimonial screenshot'}
                            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-end justify-between gap-2">
                            <span className="text-xs text-white line-clamp-2 font-medium">
                              {t.caption || 'Customer WhatsApp feedback'}
                            </span>
                            <ZoomIn className="w-4 h-4 text-[#DFC48C] shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bulk Quote Card */}
              {isSectionEnabled('bulk_quote') && (
                <div data-track-section="bulk_quote" className={isSectionEnabled('testimonials') ? 'lg:col-span-5' : 'lg:col-span-12 max-w-xl mx-auto w-full'}>
                  <div className="bg-[#640B1A] text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
                    <div>
                      <h2 className="font-display text-2xl font-bold text-white">
                        {bulkSec?.title || 'Bulk Orders (1,000kg and Above)'}
                      </h2>
                      <p className="text-sm text-[#F4EFE6]/90 mt-1.5">
                        {bulkSec?.subtitle || 'Request a tailored wholesale quotation directly from our supply desk.'}
                      </p>
                    </div>
                    <BulkQuoteForm compact />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* 7. DELIVERY INFO & CONTACT TRUST STRIP */}
      {(isSectionEnabled('delivery_info') || isSectionEnabled('contact')) && (
        <section data-track-section="delivery_info" className="py-12 bg-[#F4EFE6] border-t border-[#E5DDD0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-center">
              {isSectionEnabled('delivery_info') && (
                <>
                  <div className="flex items-start gap-3.5">
                    <Truck className="w-6 h-6 text-[#2B5B2C] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E1916]">
                        {deliverySec?.title || 'Delivery Destinations'}
                      </h3>
                      <p className="text-xs text-[#5A504A] mt-0.5">
                        {storefront.deliveryZones.map((z) => z.name).join(', ') || 'UK, USA & Canada'}
                      </p>
                      <Link to="/delivery" className="text-xs font-semibold text-[#640B1A] hover:underline mt-1 inline-block">
                        {deliverySec?.cta_primary_label || 'View Delivery Details'}
                      </Link>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <ShieldCheck className="w-6 h-6 text-[#2B5B2C] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E1916]">Already-Cleaned Grade A</h3>
                      <p className="text-xs text-[#5A504A] mt-0.5">
                        Carefully sorted botanical leaves, flowers, seeds, and powders.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {isSectionEnabled('contact') && (
                <>
                  <div className="flex items-start gap-3.5">
                    <Mail className="w-6 h-6 text-[#640B1A] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-semibold text-[#1E1916]">Business & Quote Email</h3>
                      <a
                        href={`mailto:${settings.business_email || 'zobowellness2025@gmail.com'}`}
                        className="text-xs text-[#5A504A] hover:text-[#640B1A] break-all"
                      >
                        {settings.business_email || 'zobowellness2025@gmail.com'}
                      </a>
                    </div>
                  </div>

                  <div className="flex md:justify-end">
                    <a
                      href={`https://wa.me/${whatsappClean}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] transition-colors whitespace-nowrap"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{contactSec?.cta_primary_label || 'Chat on WhatsApp'}</span>
                    </a>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Lightbox for Testimonials */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div
            className="relative max-w-2xl w-full bg-white rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxImg(null)}
              aria-label="Close image preview"
              className="absolute top-3 right-3 z-10 p-2 rounded-full bg-black/60 text-white hover:bg-black cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={lightboxImg.url}
              alt={lightboxImg.caption || 'Customer review screenshot'}
              className="w-full max-h-[80vh] object-contain bg-[#111]"
            />
            {lightboxImg.caption && (
              <div className="p-4 bg-white border-t border-[#E5DDD0] text-sm text-[#1E1916]">
                {lightboxImg.caption}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
