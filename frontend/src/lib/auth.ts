const USER_KEY = 'prodcasters_user';

let accessToken: string | null = null;

export function getAccessToken(): string | null {
  return accessToken;
}

/** @deprecated Use getAccessToken */
export function getToken(): string | null {
  return getAccessToken();
}

export function setAccessToken(token: string) {
  accessToken = token;
}

export function setUser(user: object) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function setAuth(token: string, user: object) {
  setAccessToken(token);
  setUser(user);
}

export function clearAuth() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(USER_KEY);
  }
}

export function getStoredUser<T>(): T | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}
