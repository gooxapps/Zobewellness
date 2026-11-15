import { useMemo, useState } from 'react';
import { Minus, Plus, Trash2, X, MessageCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { useStore } from '../context/StoreContext.tsx';
import { ImageWithFallback } from './ImageWithFallback.tsx';

export function CartDrawer() {
  const {
    storefront,
    cart,
    cartOpen,
    setCartOpen,
    updateCartQty,
    removeFromCart,
    clearCart,
    formatMoney,
    currency,
  } = useStore();

  const zones = storefront?.deliveryZones || [];
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedOrder, setSubmittedOrder] = useState<{
    orderNumber: string;
    whatsappUrl: string;
    whatsappMessage: string;
    estimatedTotal: number;
    deliveryFeePending: boolean;
    hasUnpricedItems: boolean;
  } | null>(null);

  const selectedZone = useMemo(
    () => zones.find((z) => String(z.id) === selectedZoneId) || null,
    [zones, selectedZoneId]
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        if (item.unitPrice === null) return sum;
        return sum + item.unitPrice * item.quantity;
      }, 0),
    [cart]
  );

  const hasUnpricedItems = useMemo(() => cart.some((item) => item.unitPrice === null), [cart]);

  const deliveryCalculation = useMemo(() => {
    if (!selectedZone) return { fee: null as number | null, pending: true, label: 'Select a destination' };
    if (selectedZone.fee === null || selectedZone.fee === undefined) {
      return { fee: null, pending: true, label: 'To be confirmed via WhatsApp' };
    }
    const feeNum = Number(selectedZone.fee);
    const thresh =
      selectedZone.free_threshold !== null && selectedZone.free_threshold !== undefined
        ? Number(selectedZone.free_threshold)
        : null;
    if (thresh !== null && !hasUnpricedItems && subtotal >= thresh) {
      return { fee: 0, pending: false, label: 'FREE (threshold met)' };
    }
    return { fee: feeNum, pending: false, label: formatMoney(feeNum) };
  }, [selectedZone, subtotal, hasUnpricedItems, formatMoney]);

  const estimatedTotal = subtotal + (deliveryCalculation.fee ?? 0);

  if (!cartOpen) return null;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          customerEmail,
          deliveryZoneId: selectedZone ? selectedZone.id : null,
          deliveryDestination: selectedZone ? selectedZone.name : 'Custom Location',
          deliveryAddress,
          notes,
          items: cart.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Could not save order enquiry.');
      }

      setSubmittedOrder({
        orderNumber: data.orderNumber,
        whatsappUrl: data.whatsappUrl,
        whatsappMessage: data.whatsappMessage,
        estimatedTotal: data.estimatedTotal,
        deliveryFeePending: data.deliveryFeePending,
        hasUnpricedItems: data.hasUnpricedItems,
      });
      clearCart();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Unable to submit order enquiry.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-[#FBF8F3] h-full flex flex-col shadow-2xl border-l border-[#E5DDD0]">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#E5DDD0] flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-[#640B1A]">Your Order Cart</h2>
            <p className="text-xs text-[#5A504A]">
              Review items and confirm directly with Zobowellness on WhatsApp
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setCartOpen(false);
              setSubmittedOrder(null);
            }}
            aria-label="Close cart"
            className="p-2 rounded-lg text-[#5A504A] hover:bg-[#F4EFE6] cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submittedOrder ? (
            <div className="bg-white rounded-xl border border-[#D8CEC0] p-6 space-y-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#2B5B2C] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-lg font-semibold text-[#1E1916]">
                    Order Enquiry Saved ({submittedOrder.orderNumber})
                  </h3>
                  <p className="text-sm text-[#5A504A] mt-1">
                    Your order enquiry has been recorded as <strong>New enquiry</strong>. Click below to open WhatsApp with your pre-filled order summary for final confirmation.
                  </p>
                </div>
              </div>

              <div className="bg-[#F4EFE6] rounded-lg p-4 text-xs font-mono text-[#3B332E] whitespace-pre-wrap max-h-60 overflow-y-auto border border-[#E5DDD0]">
                {submittedOrder.whatsappMessage}
              </div>

              <div className="flex flex-col gap-2.5">
                <a
                  href={submittedOrder.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#25D366] text-[#0E2F1A] font-semibold text-sm hover:bg-[#20BD5A] transition-colors"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span>Open WhatsApp to Complete Order</span>
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setSubmittedOrder(null);
                    setCartOpen(false);
                  }}
                  className="w-full px-4 py-2.5 rounded-lg border border-[#D8CEC0] text-sm font-medium text-[#3B332E] hover:bg-[#F4EFE6] cursor-pointer"
                >
                  Continue Browsing
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <p className="text-base font-medium text-[#1E1916]">Your shopping cart is empty.</p>
              <p className="text-sm text-[#5A504A]">
                Select packaging sizes from our botanical catalogue to prepare a WhatsApp order enquiry.
              </p>
            </div>
          ) : (
            <>
              {/* Cart Items */}
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.variantId}
                    className="bg-white rounded-xl border border-[#E5DDD0] p-3.5 flex gap-3.5 items-center"
                  >
                    <ImageWithFallback
                      src={item.imageUrl}
                      alt={item.productName}
                      className="w-16 h-16 rounded-lg object-cover shrink-0 bg-[#F4EFE6]"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-[#1E1916] truncate">
                        {item.productName}
                      </h4>
                      <p className="text-xs text-[#5A504A]">
                        Pack: {item.packagingSize} ·{' '}
                        {item.unitPrice !== null
                          ? `${formatMoney(item.unitPrice)} each`
                          : 'Price to be confirmed'}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="inline-flex items-center border border-[#D8CEC0] rounded-lg bg-[#FBF8F3]">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variantId, item.quantity - 1)}
                            aria-label="Decrease quantity"
                            className="p-1.5 text-[#3B332E] hover:text-[#640B1A] cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2.5 text-xs font-mono tabular-nums font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.variantId, item.quantity + 1)}
                            aria-label="Increase quantity"
                            className="p-1.5 text-[#3B332E] hover:text-[#640B1A] cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-[#640B1A] tabular-nums">
                            {item.unitPrice !== null
                              ? formatMoney(item.unitPrice * item.quantity)
                              : 'Enquiry'}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.variantId)}
                            aria-label="Remove item"
                            className="text-[#8A7E75] hover:text-[#9F1239] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Summary */}
              <div className="bg-white rounded-xl border border-[#E5DDD0] p-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#5A504A]">
                  <span>Items Subtotal ({currency})</span>
                  <span className="tabular-nums font-medium text-[#1E1916]">
                    {hasUnpricedItems && subtotal === 0
                      ? 'To be confirmed'
                      : `${formatMoney(subtotal)}${hasUnpricedItems ? ' + quoted items' : ''}`}
                  </span>
                </div>
                <div className="flex justify-between text-[#5A504A]">
                  <span>Delivery Charge</span>
                  <span className="tabular-nums font-medium text-[#1E1916]">
                    {deliveryCalculation.label}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#F0EAE0] flex justify-between font-semibold text-base text-[#640B1A]">
                  <span>Estimated Total</span>
                  <span className="tabular-nums">
                    {hasUnpricedItems && subtotal === 0
                      ? 'Confirm via WhatsApp'
                      : `${formatMoney(estimatedTotal)}${deliveryCalculation.pending || hasUnpricedItems ? ' +' : ''}`}
                  </span>
                </div>
              </div>

              {/* Customer Details Form */}
              <form id="whatsapp-checkout-form" onSubmit={handleCheckout} className="space-y-3.5">
                <h3 className="text-sm font-semibold text-[#1E1916]">Customer & Delivery Details</h3>

                {submitError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Your full name"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#3B332E] mb-1">
                      Phone / WhatsApp Number *
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 587 000 0000"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#3B332E] mb-1">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">
                    Delivery Destination *
                  </label>
                  <select
                    required
                    value={selectedZoneId}
                    onChange={(e) => setSelectedZoneId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  >
                    <option value="">Select destination country / zone</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.id}>
                        {z.name} — {z.fee !== null ? formatMoney(z.fee) : 'Fee confirmed on WhatsApp'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">
                    Delivery Address (Street, City, Postal/ZIP Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Street address, city, province/state, postal code"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#3B332E] mb-1">
                    Additional Instructions (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Packaging notes, preferred courier, or delivery timing..."
                    className="w-full px-3.5 py-2 rounded-lg border border-[#D8CEC0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
                  />
                </div>
              </form>
            </>
          )}
        </div>

        {/* Footer CTA */}
        {!submittedOrder && cart.length > 0 && (
          <div className="p-5 bg-white border-t border-[#E5DDD0]">
            <button
              type="submit"
              form="whatsapp-checkout-form"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-lg bg-[#2B5B2C] text-white font-semibold text-sm hover:bg-[#1F4520] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <MessageCircle className="w-5 h-5" />
              <span>{submitting ? 'Saving Order Enquiry...' : 'Proceed to WhatsApp'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
