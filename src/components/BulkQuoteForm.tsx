import { useState } from 'react';
import { Building2, MapPin, Package, Phone, Send, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function BulkQuoteForm({ compact = false }: { compact?: boolean }) {
  const { storefront } = useStore();
  const settings = storefront?.settings || {};
  const minBulk = settings.min_bulk_kg || '1000';
  const enabled = settings.bulk_quote_enabled !== 'false';

  const [companyName, setCompanyName] = useState('');
  const [location, setLocation] = useState('');
  const [quantityRequired, setQuantityRequired] = useState('');
  const [phoneContact, setPhoneContact] = useState('');
  const [email, setEmail] = useState('');
  const [productInterest, setProductInterest] = useState('Grade A Hibiscus Leaves');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ referenceCode: string; message: string } | null>(null);

  if (!enabled) {
    return (
      <div className="bg-white/10 border border-white/20 rounded-xl p-6 text-sm text-[#F4EFE6]">
        Bulk quotation submissions are currently paused. Please reach us directly on WhatsApp at{' '}
        {settings.whatsapp_number || '+15875453110'}.
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch('/api/bulk-quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          location,
          quantityRequired,
          phoneContact,
          email,
          productInterest,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not submit quotation enquiry.');
      setSuccess({ referenceCode: data.referenceCode, message: data.message });
      setCompanyName('');
      setLocation('');
      setQuantityRequired('');
      setPhoneContact('');
      setEmail('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send quotation request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-xl border border-[#D8CEC0] p-6 text-[#1E1916] space-y-3">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-[#2B5B2C] shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-base">Quotation Request Submitted ({success.referenceCode})</h4>
            <p className="text-sm text-[#5A504A] mt-1">{success.message}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSuccess(null)}
          className="px-4 py-2 rounded-lg bg-[#640B1A] text-white text-xs font-medium hover:bg-[#4A0712] cursor-pointer"
        >
          Submit Another Request
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="relative">
        <Building2 className="w-4 h-4 text-[#7D7168] absolute left-3.5 top-3" />
        <input
          type="text"
          required
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Company Name"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
        />
      </div>

      <div className="relative">
        <MapPin className="w-4 h-4 text-[#7D7168] absolute left-3.5 top-3" />
        <input
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Location (City, Country)"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
        />
      </div>

      <div className="relative">
        <Package className="w-4 h-4 text-[#7D7168] absolute left-3.5 top-3" />
        <input
          type="text"
          required
          value={quantityRequired}
          onChange={(e) => setQuantityRequired(e.target.value)}
          placeholder={`Quantity Required (${Number(minBulk).toLocaleString()}kg and above)`}
          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
        />
      </div>

      <div className="relative">
        <Phone className="w-4 h-4 text-[#7D7168] absolute left-3.5 top-3" />
        <input
          type="tel"
          required
          value={phoneContact}
          onChange={(e) => setPhoneContact(e.target.value)}
          placeholder="Phone / WhatsApp Contact"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
        />
      </div>

      {!compact && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Business Email (Optional)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
            />
            <input
              type="text"
              value={productInterest}
              onChange={(e) => setProductInterest(e.target.value)}
              placeholder="Product (e.g. Grade A Hibiscus Leaves)"
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
            />
          </div>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Delivery schedule, packaging preference, or port requirements..."
            className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-[#1E1916] text-sm focus:outline-none focus:ring-2 focus:ring-[#C29B40]"
          />
        </>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#2B5B2C] text-white font-semibold text-sm hover:bg-[#1F4520] disabled:opacity-60 transition-colors cursor-pointer"
      >
        <Send className="w-4 h-4" />
        <span>{submitting ? 'Sending Enquiry...' : 'Send Enquiry'}</span>
      </button>
    </form>
  );
}
