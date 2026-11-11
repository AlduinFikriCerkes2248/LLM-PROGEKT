import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const PROFILE_UPDATED_EVENT = "matchday:profile-updated";

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  supabaseClient ??= createClient(url, key);
  return supabaseClient;
}
