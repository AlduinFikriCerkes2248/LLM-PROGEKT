import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function db(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Немає NEXT_PUBLIC_SUPABASE_URL або NEXT_PUBLIC_SUPABASE_ANON_KEY у середовищі"
    );
  }

  client = createClient(url, anonKey);
  return client;
}
