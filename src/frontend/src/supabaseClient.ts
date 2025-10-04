// src/supabaseClient.ts
import { createClient } from "@supabase/supabase-js";

// Read from Vite env (provided at build time). No hard-coded secrets in code.
const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = import.meta.env;
const supabaseUrl = SUPABASE_URL as string;
const supabasePublishableKey = SUPABASE_PUBLISHABLE_KEY as string;

if (!supabaseUrl || !supabasePublishableKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY. Supabase client may fail to initialize."
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
