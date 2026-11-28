import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  const isTest = import.meta.env.MODE === 'test';
  const liveTestRequested = Boolean((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env?.TEST_LIVE_SUPABASE);
  if (isTest && !liveTestRequested) {
    return false;
  }
  const url = import.meta.env.VITE_SUPABASE_URL || supabaseUrl;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || supabaseAnonKey;
  return Boolean(
    url &&
      typeof url === 'string' &&
      url.trim().length > 0 &&
      !url.includes('placeholder') &&
      !url.includes('your-project') &&
      anonKey &&
      typeof anonKey === 'string' &&
      anonKey.trim().length > 0 &&
      !anonKey.includes('placeholder') &&
      !anonKey.includes('your-anon-key')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
