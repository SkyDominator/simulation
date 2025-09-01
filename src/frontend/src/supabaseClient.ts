// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Read from Vite env (provided at build time). No hard-coded secrets in code.
const { VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY } = import.meta.env;
const supabaseUrl = VITE_SUPABASE_URL as string;
const supabasePublishableKey = VITE_SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY. Supabase client may fail to initialize."
  );
}

// Explicit auth config to improve mobile (iOS) consistency
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});
