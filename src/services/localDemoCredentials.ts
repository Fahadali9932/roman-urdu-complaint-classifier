/**
 * Disposable credentials for the unconnected, in-browser demonstration only.
 * They are generated per browser session; no shared password ships in source.
 * Real Supabase staff authentication never reads these values.
 */
export interface LocalDemoCredentials {
  adminPassword: string;
  staffPassword: string;
}

let cached: LocalDemoCredentials | null = null;

function secretFor(key: string, configured?: string): string {
  if (configured && configured.length >= 12) return configured;

  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
  } catch {
    // Storage may be disabled in tests or private browsing.
  }

  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  const generated = `L0cal-${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}!`;
  try {
    sessionStorage.setItem(key, generated);
  } catch {
    // The module-level value remains stable until a reload.
  }
  return generated;
}

export function getLocalDemoCredentials(): LocalDemoCredentials {
  if (import.meta.env.PROD) return { adminPassword: '', staffPassword: '' };
  if (!cached) {
    cached = {
      adminPassword: secretFor('awaaz_local_admin_key', import.meta.env.VITE_AWAAZ_LOCAL_ADMIN_PASSWORD),
      staffPassword: secretFor('awaaz_local_staff_key', import.meta.env.VITE_AWAAZ_LOCAL_STAFF_PASSWORD),
    };
  }
  return cached;
}
