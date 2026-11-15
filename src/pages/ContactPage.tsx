import { useState } from 'react';
import { Mail, MessageCircle, Globe, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function ContactPage() {
  const { storefront } = useStore();
  const settings = storefront?.settings || {};
  const whatsappNumber = settings.whatsapp_number || '+15875453110';
  const whatsappClean = whatsappNumber.replace(/[^\d]/g, '');
  const businessEmail = settings.business_email || 'zobowellness2025@gmail.com';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not send message.');
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-5 space-y-6">
          <div>
            <p className="text-sm font-semibold text-[#2B5B2C]">Get in Touch</p>
            <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#640B1A] mt-1">
              Contact Zobowellness
            </h1>
            <p className="text-base text-[#5A504A] mt-3">
              Reach out for retail orders, commercial hibiscus supply, packaging questions, or delivery confirmation.
            </p>
          </div>

          <div className="space-y-4">
            <a
              href={`https://wa.me/${whatsappClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block bg-white rounded-xl border border-[#E5DDD0] p-5 hover:border-[#2B5B2C] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-lg bg-[#2B5B2C]/10 text-[#2B5B2C]">
                  <MessageCircle className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs text-[#5A504A]">WhatsApp Direct</p>
                  <p className="text-base font-semibold text-[#1E1916] tabular-nums">{whatsappNumber}</p>
                </div>
              </div>
            </a>

            <a
              href={`mailto:${businessEmail}`}
              className="block bg-white rounded-xl border border-[#E5DDD0] p-5 hover:border-[#640B1A] transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-lg bg-[#640B1A]/10 text-[#640B1A]">
                  <Mail className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs text-[#5A504A]">Business Email</p>
                  <p className="text-base font-semibold text-[#1E1916] break-all">{businessEmail}</p>
                </div>
              </div>
            </a>

            <div className="bg-white rounded-xl border border-[#E5DDD0] p-5">
              <div className="flex items-center gap-3.5">
                <span className="p-2.5 rounded-lg bg-[#C29B40]/15 text-[#8A6A1C]">
                  <Globe className="w-5 h-5" />
                </span>
                <div>
                  <p className="text-xs text-[#5A504A]">Website</p>
                  <p className="text-base font-semibold text-[#1E1916]">
                    {settings.website_url || 'zobowellness.faisal.com'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#E5DDD0] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-[#1E1916] mb-5">Send an Enquiry</h2>

          {sent ? (
            <div className="p-6 rounded-xl bg-[#F4EFE6] border border-[#D8CEC0] space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#2B5B2C] shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-base text-[#1E1916]">Message Received</h3>
                  <p className="text-sm text-[#5A504A] mt-1">
                    Thank you for contacting Zobowellness. Our team will respond via email or WhatsApp.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSent(false)}
                className="px-4 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-medium cursor-pointer"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">Phone / WhatsApp</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 587 000 0000"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Product enquiry, packaging, or delivery"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3B332E] mb-1">Message *</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can Zobowellness help you?"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#640B1A] text-white font-semibold text-sm hover:bg-[#4A0712] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{submitting ? 'Sending...' : 'Send Message'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
