import { useState } from 'react';
import { Mail, MessageCircle, Globe, ShieldCheck, Send } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { Link } from '../lib/router.tsx';
import { ImageWithFallback } from './ImageWithFallback.tsx';

export function Footer() {
  const { storefront, getSection, isSectionEnabled, showToast } = useStore();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribing, setSubscribing] = useState(false);

  if (!isSectionEnabled('footer')) return null;

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newsletterEmail.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid email address.');
      return;
    }
    setSubscribing(true);
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Unable to subscribe right now.');
      }
      setNewsletterEmail('');
      showToast(data.message || 'Subscribed to Zobowellness promotional updates!');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Unable to subscribe right now.');
    } finally {
      setSubscribing(false);
    }
  };

  const settings = storefront?.settings || {};
  const footerSec = getSection('footer');
  const footerLinks = (storefront?.navigation || []).filter((n) => n.location === 'footer');
  const whatsappClean = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

  return (
    <footer className="bg-[#3B060F] text-[#F4EFE6] border-t border-[#54101C]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand Column */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src={settings.dark_logo_url || '/assets/aistudio/IMG-20261103-WA0017_532d4ad8.jpg'}
                alt={settings.business_name || 'Zobowellness'}
                className="h-14 w-14 rounded-lg object-cover border border-white/15"
              />
              <div>
                <h3 className="font-display text-xl font-semibold text-white">
                  {settings.business_name || 'Zobowellness'}
                </h3>
                <p className="text-xs text-[#DFC48C]">{footerSec?.subtitle || settings.tagline}</p>
              </div>
            </div>
            <p className="text-sm text-[#E4D9CE] leading-relaxed">
              {footerSec?.body ||
                'Supplying cleaned Grade A hibiscus leaves and botanical ingredients across Canada, the UK, and the USA.'}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-sm font-semibold text-[#DFC48C] mb-4">Quick Links</h4>
            <ul className="space-y-2.5 text-sm">
              {footerLinks.map((item) => (
                <li key={item.id}>
                  <Link to={item.href} className="text-[#E4D9CE] hover:text-white transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-semibold text-[#DFC48C] mb-4">Direct Contact</h4>
            <ul className="space-y-3 text-sm text-[#E4D9CE]">
              <li>
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-[#DFC48C]" />
                  <span className="tabular-nums">{settings.whatsapp_number || '+15875453110'}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${settings.business_email || 'zobowellness2025@gmail.com'}`}
                  className="inline-flex items-center gap-2.5 hover:text-white transition-colors"
                >
                  <Mail className="w-4 h-4 text-[#DFC48C]" />
                  <span>{settings.business_email || 'zobowellness2025@gmail.com'}</span>
                </a>
              </li>
              <li className="inline-flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-[#DFC48C]" />
                <span>{settings.website_url || 'zobowellness.faisal.com'}</span>
              </li>
            </ul>
          </div>

          {/* Supply & Admin */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-[#DFC48C]">Wholesale & Orders</h4>
            <p className="text-sm text-[#E4D9CE] leading-relaxed">
              Orders are confirmed directly via WhatsApp. Bulk requests of{' '}
              <span className="tabular-nums font-medium">{settings.min_bulk_kg || '1000'}kg+</span> are handled by our quotation desk.
            </p>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/${whatsappClean}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2B5B2C] text-white text-xs font-medium hover:bg-[#1F4520] transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
            {[
              { label: 'Facebook', url: settings.social_facebook },
              { label: 'Instagram', url: settings.social_instagram },
              { label: 'YouTube', url: settings.social_youtube },
              { label: 'LinkedIn', url: settings.social_linkedin },
              { label: 'X', url: settings.social_x },
            ].some((s) => Boolean(s.url)) && (
              <div className="flex flex-wrap gap-3 pt-1 text-xs">
                {[
                  { label: 'Facebook', url: settings.social_facebook },
                  { label: 'Instagram', url: settings.social_instagram },
                  { label: 'YouTube', url: settings.social_youtube },
                  { label: 'LinkedIn', url: settings.social_linkedin },
                  { label: 'X', url: settings.social_x },
                ]
                  .filter((s) => Boolean(s.url))
                  .map((s) => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#DFC48C] hover:text-white underline underline-offset-2"
                    >
                      {s.label}
                    </a>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 rounded-2xl bg-[#2C040B]/70 border border-white/15 p-6 sm:p-7 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1 max-w-xl">
            <h4 className="font-display text-lg font-semibold text-[#DFC48C]">
              Botanical &amp; Promotional Updates
            </h4>
            <p className="text-xs sm:text-sm text-[#E4D9CE] leading-relaxed">
              Join our mailing list for seasonal harvest restocks, bulk supply updates, and special promotional pricing.
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="w-full lg:w-auto flex flex-col sm:flex-row gap-2.5">
            <label htmlFor="footer-newsletter-email" className="sr-only">
              Email address for promotional updates
            </label>
            <input
              id="footer-newsletter-email"
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address"
              className="w-full sm:w-72 px-4 py-2.5 rounded-lg bg-[#FBF8F3] text-[#1E1916] placeholder-[#7B6E65] text-sm border border-[#DFC48C]/40 focus:outline-none focus:ring-2 focus:ring-[#DFC48C]"
            />
            <button
              type="submit"
              disabled={subscribing}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] disabled:opacity-60 transition-colors cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>{subscribing ? 'Subscribing...' : 'Subscribe'}</span>
            </button>
          </form>
        </div>

        <div className="mt-8 pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#D5C6B8]">
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-center sm:text-left">
            <p>
              &copy; {new Date().getFullYear()} {settings.business_name || 'Zobowellness'}. All rights reserved.
            </p>
            <span className="hidden sm:inline text-white/25">|</span>
            <p className="text-[#DFC48C]">Developed by Emmanuel Kenny (staysafelite)</p>
          </div>
          <div className="flex items-center gap-5">
            <span>Currency: {settings.currency || 'CAD'}</span>
            <Link to="/admin" className="inline-flex items-center gap-1.5 text-[#DFC48C] hover:text-white transition-colors">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Owner Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
