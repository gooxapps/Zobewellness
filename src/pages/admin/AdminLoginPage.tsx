import { useState } from 'react';
import { Lock, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link, useRouter } from '../../lib/router.tsx';
import { setAdminToken } from '../../lib/adminFetch.ts';
import { useStore } from '../../context/StoreContext.tsx';
import { ImageWithFallback } from '../../components/ImageWithFallback.tsx';

export function AdminLoginPage({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { storefront } = useStore();
  const { navigate } = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const settings = storefront?.settings || {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: identifier.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed.');
      }
      if (data.token) {
        setAdminToken(data.token);
      }
      onLoginSuccess();
      navigate('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBF8F3] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex justify-center">
            <ImageWithFallback
              src={settings.light_logo_url || '/assets/aistudio/IMG-20261103-WA0016_9bc2fb38.jpg'}
              alt="Zobowellness"
              className="h-16 w-16 rounded-xl object-cover border border-[#E5DDD0]"
            />
          </div>
          <h1 className="font-display text-3xl font-bold text-[#640B1A]">
            Administrator Sign In
          </h1>
          <p className="text-sm text-[#5A504A]">
            Private management portal for {settings.business_name || 'Zobowellness'}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5DDD0] shadow-sm p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#3B332E] mb-1.5">
                Admin Email or Username
              </label>
              <input
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Enter your admin email or username"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3B332E] mb-1.5">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#D8CEC0] bg-[#FBF8F3] text-sm focus:outline-none focus:ring-2 focus:ring-[#640B1A]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-[#640B1A] text-white font-semibold text-sm hover:bg-[#4A0712] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Signing In...' : 'Sign In to Dashboard'}</span>
            </button>
          </form>
        </div>

        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5A504A] hover:text-[#640B1A]">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Zobowellness Storefront</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
