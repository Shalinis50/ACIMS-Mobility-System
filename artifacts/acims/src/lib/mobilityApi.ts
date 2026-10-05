import type { UserProfile } from '@/lib/auth-context';

export const ADMIN_MOBILITY_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'x-acims-role': 'admin',
  'x-acims-user-id': 'admin-demo',
};

export function studentMobilityHeaders(token: string | null, profile: UserProfile | null): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  } else if (profile?.userId) {
    headers['x-acims-user-id'] = profile.userId;
    headers['x-acims-role'] = profile.role || 'STUDENT';
  }
  return headers;
}

export async function mobilityAdminFetch(path: string, init?: RequestInit) {
  return fetch(`/api${path}`, {
    ...init,
    headers: { ...ADMIN_MOBILITY_HEADERS, ...(init?.headers as Record<string, string>) },
  });
}
