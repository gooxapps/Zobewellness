import { useState } from 'react';
import { Leaf } from 'lucide-react';

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-[#F4EFE6] text-[#640B1A] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Leaf className="w-8 h-8 mb-2 opacity-60" />
        {fallbackTitle && <span className="text-xs font-medium text-[#5A504A] line-clamp-2">{fallbackTitle}</span>}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
