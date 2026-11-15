const TOKEN_KEY = 'zobo_admin_jwt';
let memoryToken: string | null = null;

export function getAdminToken(): string | null {
  if (memoryToken) return memoryToken;
  try {
    const stored = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
    if (stored) memoryToken = stored;
    return stored;
  } catch {
    return memoryToken;
  }
}

export function setAdminToken(token: string): void {
  memoryToken = token;
  try {
    sessionStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore storage quota or iframe security errors; memoryToken remains active
  }
}

export function clearAdminToken(): void {
  memoryToken = null;
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

export async function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const token = getAdminToken();
  const headers = new Headers(init.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: 'include',
  });
}
