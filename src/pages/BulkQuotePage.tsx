import { MessageCircle, Mail, Package } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { BulkQuoteForm } from '../components/BulkQuoteForm.tsx';

export function BulkQuotePage() {
  const { storefront } = useStore();
  const settings = storefront?.settings || {};
  const minBulk = settings.min_bulk_kg || '1000';
  const quoteEmail = settings.quotation_email || settings.business_email || 'zobowellness2025@gmail.com';
  const whatsappClean = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-6 space-y-6">
          <p className="text-sm font-semibold text-[#2B5B2C]">
            Wholesale & Commercial Botanical Supply
          </p>
          <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#640B1A]">
            Bulk Orders ({Number(minBulk).toLocaleString()}kg and Above)
          </h1>
          <p className="text-base text-[#433A35] leading-relaxed">
            For wholesalers, resellers, commercial beverage makers, African store chains, and caterers ordering{' '}
            <strong className="tabular-nums">{Number(minBulk).toLocaleString()}kg and above</strong> of cleaned Grade A hibiscus leaves or bulk botanicals, our supply team prepares custom quotations based on volume, packaging format, and destination.
          </p>

          <div className="space-y-4 pt-2">
            <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 flex items-start gap-3.5">
              <Package className="w-5 h-5 text-[#640B1A] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#1E1916]">Standard Retail & Bag Sizes (1kg – 100kg)</h2>
                <p className="text-xs text-[#5A504A] mt-1">
                  Looking for 1kg, 2.5kg, 5kg, 10kg, 25kg, 50kg, or 100kg packs? Order directly through the Shop catalogue and Cart.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 flex items-start gap-3.5">
              <Mail className="w-5 h-5 text-[#640B1A] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#1E1916]">Direct Quotation Desk</h2>
                <p className="text-xs text-[#5A504A] mt-1">
                  All submissions are routed directly to <span className="font-medium text-[#1E1916]">{quoteEmail}</span> and logged in our supply dashboard.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#E5DDD0] p-5 flex items-start gap-3.5">
              <MessageCircle className="w-5 h-5 text-[#2B5B2C] shrink-0 mt-0.5" />
              <div>
                <h2 className="text-sm font-semibold text-[#1E1916]">Urgent Wholesale Coordination</h2>
                <a
                  href={`https://wa.me/${whatsappClean}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-[#2B5B2C] hover:underline mt-1 inline-block"
                >
                  Message {settings.whatsapp_number || '+15875453110'} on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 bg-[#640B1A] text-white rounded-2xl p-6 sm:p-8 shadow-lg space-y-5">
          <div>
            <h2 className="font-display text-2xl font-bold text-white">Request a Bulk Quotation</h2>
            <p className="text-sm text-[#F4EFE6]/90 mt-1">
              Provide your company name, destination location, required quantity, and contact number.
            </p>
          </div>
          <BulkQuoteForm />
        </div>
      </div>
    </div>
  );
}
