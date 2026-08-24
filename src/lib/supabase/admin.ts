import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role client, for the ingest job only.
 *
 * The service role bypasses RLS, so this key must never reach the browser.
 * It is read from a non-`NEXT_PUBLIC_` variable so Next cannot inline it into
 * client bundles, and this module is only imported from route handlers.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) return null;

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
