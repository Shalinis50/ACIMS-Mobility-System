import { useState, useEffect } from 'react';

export const ADMIN_AUTH_KEY = 'acmis_admin_authenticated';

// Demo admin credentials for college prototype evaluation
export const DEMO_ADMIN_USERNAME = 'admin';
export const DEMO_ADMIN_PASSWORD = 'acmis123';

/**
 * Checks if admin is authenticated in the current browser session.
 */
export function isAdminAuthenticated(): boolean {
  try {
    return sessionStorage.getItem(ADMIN_AUTH_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Simple demo credential verification.
 */
export function adminLogin(
  username: string,
  password: string
): { success: boolean; error?: string } {
  if (
    username.trim() === DEMO_ADMIN_USERNAME &&
    password === DEMO_ADMIN_PASSWORD
  ) {
    try {
      sessionStorage.setItem(ADMIN_AUTH_KEY, 'true');
    } catch {}
    window.dispatchEvent(new Event('acmis-admin-auth-change'));
    return { success: true };
  }
  return { success: false, error: 'Invalid admin username or password.' };
}

/**
 * Clears demo admin session and broadcasts logout.
 */
export function adminLogout(): void {
  try {
    sessionStorage.removeItem(ADMIN_AUTH_KEY);
  } catch {}
  window.dispatchEvent(new Event('acmis-admin-auth-change'));
}

/**
 * React hook to observe and react to admin authentication changes.
 */
export function useAdminAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() =>
    isAdminAuthenticated()
  );

  useEffect(() => {
    const handleAuthChange = () => {
      setIsAuthenticated(isAdminAuthenticated());
    };

    window.addEventListener('acmis-admin-auth-change', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      window.removeEventListener('acmis-admin-auth-change', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  return {
    isAuthenticated,
    login: adminLogin,
    logout: adminLogout,
  };
}
