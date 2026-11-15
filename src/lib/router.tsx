import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface RouterContextValue {
  path: string;
  search: string;
  navigate: (to: string) => void;
}

const RouterContext = createContext<RouterContextValue>({
  path: '/',
  search: '',
  navigate: () => {},
});

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [locationState, setLocationState] = useState({
    path: window.location.pathname || '/',
    search: window.location.search || '',
  });

  useEffect(() => {
    const onPopState = () => {
      setLocationState({
        path: window.location.pathname || '/',
        search: window.location.search || '',
      });
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((to: string) => {
    if (to.startsWith('http://') || to.startsWith('https://') || to.startsWith('mailto:') || to.startsWith('tel:')) {
      window.location.href = to;
      return;
    }
    const [nextPath, nextQuery] = to.split('?');
    const fullSearch = nextQuery ? `?${nextQuery}` : '';
    window.history.pushState({}, '', `${nextPath}${fullSearch}`);
    setLocationState({ path: nextPath || '/', search: fullSearch });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return (
    <RouterContext.Provider value={{ path: locationState.path, search: locationState.search, navigate }}>
      {children}
    </RouterContext.Provider>
  );
}

export function useRouter() {
  return useContext(RouterContext);
}

export function Link({
  to,
  className = '',
  children,
  onClick,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        onClick?.();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
