import { createClient } from "@supabase/supabase-js";

export const SUPABASE_ENV_ERROR_MESSAGE =
  "Supabase env variables are missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel and local .env.";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

export function assertSupabaseConfig() {
  if (!hasSupabaseConfig) {
    throw new Error(SUPABASE_ENV_ERROR_MESSAGE);
  }
}

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
      },
    })
  : null;
