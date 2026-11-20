import { useStore } from '../context/StoreContext.tsx';
import { useRouter } from '../lib/router.tsx';
import { trackEvent } from '../lib/tracker.ts';
import { trackMetaEvent } from '../lib/metaPixel.ts';

export function WhatsAppFloatingButton() {
  const { storefront, cartOpen } = useStore();
  const { path } = useRouter();

  if (cartOpen || path.startsWith('/admin')) {
    return null;
  }

  const settings = storefront?.settings || {};
  const businessName = settings.business_name || 'Zobowellness';
  const whatsappNumber = settings.whatsapp_number || '+15875453110';
  const whatsappClean = whatsappNumber.replace(/[^\d]/g, '');

  if (!whatsappClean) {
    return null;
  }

  const prefilledMessage = `Hello ${businessName}! I would like to chat about your botanical products.`;
  const whatsappHref = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(prefilledMessage)}`;

  const handleClick = () => {
    trackEvent({
      eventType: 'action',
      pagePath: path || '/',
      sectionName: 'whatsapp_floating_button',
    });
    trackMetaEvent('Contact', {
      content_name: 'Floating WhatsApp Chat',
    });
  };

  return (
    <div className="fixed bottom-20 right-4 lg:bottom-6 lg:right-6 z-40 flex items-center gap-2.5 group">
      <span
        aria-hidden="true"
        className="hidden lg:inline-flex items-center px-3 py-1.5 rounded-lg bg-[#1E1916] text-white text-xs font-medium shadow-md opacity-0 translate-x-1 pointer-events-none transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 group-focus-within:opacity-100 group-focus-within:translate-x-0"
      >
        Chat on WhatsApp
      </span>
      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        aria-label={`Chat with ${businessName} on WhatsApp`}
        title={`Chat with ${businessName} on WhatsApp`}
        className="relative flex items-center justify-center w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-[#25D366] hover:bg-[#1EBE5D] active:scale-95 text-white shadow-[0_8px_24px_rgba(37,211,102,0.4)] hover:shadow-[0_10px_28px_rgba(37,211,102,0.52)] transition-all duration-200 ring-2 ring-white/90 focus:outline-none focus:ring-4 focus:ring-[#25D366]/45"
      >
        <svg
          viewBox="0 0 32 32"
          fill="currentColor"
          aria-hidden="true"
          className="w-7 h-7 sm:w-8 sm:h-8"
        >
          <path d="M16.004 3.2c-7.058 0-12.8 5.742-12.8 12.8 0 2.256.589 4.458 1.707 6.397L3.1 29.01l6.768-1.775A12.74 12.74 0 0 0 16.004 28.8c7.058 0 12.8-5.742 12.8-12.8s-5.742-12.8-12.8-12.8zm0 23.438c-1.915 0-3.79-.514-5.424-1.486l-.389-.231-4.016 1.053 1.072-3.916-.253-.403a10.606 10.606 0 0 1-1.628-5.655c0-5.864 4.774-10.638 10.638-10.638s10.638 4.774 10.638 10.638-4.774 10.638-10.638 10.638zm5.834-7.967c-.32-.16-1.894-.935-2.187-1.041-.293-.107-.507-.16-.72.16-.214.32-.827 1.041-1.014 1.255-.187.214-.373.24-.694.08-.32-.16-1.351-.498-2.574-1.589-.951-.848-1.594-1.895-1.781-2.215-.187-.32-.02-.493.14-.653.144-.144.32-.373.48-.56.16-.187.213-.32.32-.533.107-.214.053-.4-.027-.56-.08-.16-.72-1.735-.987-2.375-.26-.624-.524-.539-.72-.549a12.3 12.3 0 0 0-.614-.011c-.213 0-.56.08-.854.4-.293.32-1.12 1.094-1.12 2.668s1.147 3.095 1.307 3.309c.16.213 2.257 3.446 5.468 4.832.764.33 1.36.527 1.825.675.767.244 1.465.209 2.017.127.615-.092 1.894-.774 2.161-1.521.267-.748.267-1.388.187-1.521-.08-.134-.293-.214-.614-.374z" />
        </svg>
      </a>
    </div>
  );
}
