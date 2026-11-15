import { useState } from 'react';
import { Download, Share, PlusSquare, X, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import { useOnlineStatus } from '../hooks/useOnlineStatus.ts';

export function PWAInstallButton({
  variant = 'compact',
  onAction,
}: {
  variant?: 'compact' | 'menu';
  onAction?: () => void;
}) {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Native Chromium / Android / Edge install prompt
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={async () => {
          await install();
          onAction?.();
        }}
        className={
          variant === 'menu'
            ? 'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] transition-colors cursor-pointer'
            : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#C29B40]/60 bg-[#F4EFE6] text-[#640B1A] text-xs font-semibold hover:bg-[#EDE4D4] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
        }
      >
        <Download className="w-4 h-4" />
        <span>{variant === 'menu' ? 'Install Zobowellness App' : 'Install App'}</span>
      </button>
    );
  }

  // iOS Safari guided install flow (WebKit does not support beforeinstallprompt)
  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className={
            variant === 'menu'
              ? 'w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] transition-colors cursor-pointer'
              : 'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#C29B40]/60 bg-[#F4EFE6] text-[#640B1A] text-xs font-semibold hover:bg-[#EDE4D4] transition-colors whitespace-nowrap shrink-0 cursor-pointer'
          }
        >
          <Smartphone className="w-4 h-4" />
          <span>{variant === 'menu' ? 'Install on iPhone / iPad' : 'Install App'}</span>
        </button>

        {showGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4">
            <div
              role="dialog"
              aria-label="Install Zobowellness on iOS"
              className="w-full max-w-sm rounded-2xl bg-[#FBF8F3] border border-[#E5DDD0] p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-bold text-[#640B1A]">
                    Install Zobowellness App
                  </h3>
                  <p className="text-xs text-[#5A504A] mt-0.5">
                    Add Zobowellness to your iPhone or iPad Home Screen
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowGuide(false)}
                  aria-label="Close install guide"
                  className="p-1.5 rounded-lg text-[#5A504A] hover:bg-[#F4EFE6] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <ol className="space-y-3 text-sm text-[#1E1916]">
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#640B1A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Tap the <strong className="inline-flex items-center gap-1">Share <Share className="w-3.5 h-3.5 text-[#640B1A]" /></strong> button in Safari&apos;s toolbar.
                  </span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-[#640B1A] text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Scroll down and tap <strong className="inline-flex items-center gap-1">Add to Home Screen <PlusSquare className="w-3.5 h-3.5 text-[#2B5B2C]" /></strong>.
                  </span>
                </li>
              </ol>

              <button
                type="button"
                onClick={() => {
                  setShowGuide(false);
                  onAction?.();
                }}
                className="w-full py-2.5 rounded-xl bg-[#640B1A] text-white text-sm font-semibold hover:bg-[#4A0712] cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 lg:bottom-5 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#640B1A] px-3 py-2 text-xs font-medium text-white shadow-lg border border-[#DFC48C]/40"
    >
      <span className="h-2 w-2 rounded-full bg-[#DFC48C] animate-pulse" />
      <span>Offline Mode — Viewing cached store</span>
    </div>
  );
}
