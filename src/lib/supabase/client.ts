import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase is optional: it powers sign-in and saved positions, and nothing
 * else. EuroLens must run without it — every data source the app reads is
 * public and unauthenticated — so this returns null when unconfigured rather
 * than throwing and taking the whole client tree down.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  if (!isSupabaseConfigured()) return null;

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
