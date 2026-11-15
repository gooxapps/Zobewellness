import { Truck, AlertTriangle, MessageCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';

export function DeliveryPage() {
  const { storefront, formatMoney } = useStore();
  const zones = storefront?.deliveryZones || [];
  const delSettings = storefront?.deliverySettings;
  const settings = storefront?.settings || {};
  const whatsappClean = (settings.whatsapp_number || '+15875453110').replace(/[^\d]/g, '');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16 space-y-10">
      <div className="space-y-3">
        <p className="text-sm font-semibold text-[#2B5B2C]">Shipping & Order Coordination</p>
        <h1 className="font-display text-4xl sm:text-5xl font-bold text-[#640B1A]">
          Delivery Information
        </h1>
        <p className="text-base text-[#5A504A] max-w-2xl">
          Active delivery destinations, configured delivery charges, and dispatch coordination policies.
        </p>
      </div>

      {delSettings && delSettings.is_delivery_available === 0 && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong>Delivery Temporarily Paused:</strong>{' '}
            {delSettings.temporary_notice || 'Please contact us via WhatsApp for current dispatch availability.'}
          </div>
        </div>
      )}

      {delSettings && delSettings.is_delivery_available === 1 && delSettings.temporary_notice && (
        <div className="p-4 rounded-xl bg-[#F4EFE6] border border-[#DFD4C3] text-sm text-[#1E1916]">
          {delSettings.temporary_notice}
        </div>
      )}

      {/* Delivery Zones Table */}
      <div className="bg-white rounded-2xl border border-[#E5DDD0] overflow-hidden">
        <div className="px-6 py-4 bg-[#F4EFE6] border-b border-[#E5DDD0] flex items-center gap-2.5">
          <Truck className="w-5 h-5 text-[#640B1A]" />
          <h2 className="font-semibold text-base text-[#1E1916]">Active Delivery Destinations</h2>
        </div>

        {zones.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#5A504A]">
            No delivery zones are currently active. Please message us on WhatsApp to coordinate shipping.
          </div>
        ) : (
          <div className="divide-y divide-[#F0EAE0]">
            {zones.map((z) => (
              <div key={z.id} className="p-6 grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                <div className="md:col-span-4">
                  <h3 className="text-base font-semibold text-[#1E1916]">{z.name}</h3>
                  {z.region_code && <p className="text-xs text-[#7D7168] font-mono">{z.region_code}</p>}
                </div>
                <div className="md:col-span-4 space-y-1 text-sm">
                  <p className="text-[#1E1916] font-medium tabular-nums">
                    Fee: {z.fee !== null ? formatMoney(z.fee) : 'Confirmed via WhatsApp'}
                  </p>
                  {z.free_threshold !== null && (
                    <p className="text-xs text-[#2B5B2C] font-medium tabular-nums">
                      Free delivery on orders over {formatMoney(z.free_threshold)}
                    </p>
                  )}
                </div>
                <div className="md:col-span-4 space-y-1 text-xs text-[#5A504A]">
                  {z.estimated_time && <p className="font-medium text-[#1E1916]">{z.estimated_time}</p>}
                  {z.notes && <p>{z.notes}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Policy */}
      {delSettings?.policy_text && (
        <div className="bg-white rounded-2xl border border-[#E5DDD0] p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#640B1A]">Delivery Policy & Coordination</h2>
          <p className="text-sm sm:text-base text-[#433A35] leading-relaxed whitespace-pre-line">
            {delSettings.policy_text}
          </p>
          <div className="pt-2">
            <a
              href={`https://wa.me/${whatsappClean}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#2B5B2C] text-white text-sm font-semibold hover:bg-[#1F4520] transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Confirm Delivery Rate on WhatsApp</span>
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
