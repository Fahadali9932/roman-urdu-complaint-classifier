import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = (): boolean => {
  if (import.meta.env.MODE === 'test') {
    return false;
  }
  return Boolean(
    supabaseUrl &&
      typeof supabaseUrl === 'string' &&
      !supabaseUrl.includes('placeholder') &&
      supabaseAnonKey &&
      typeof supabaseAnonKey === 'string' &&
      !supabaseAnonKey.includes('placeholder')
  );
};

export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
