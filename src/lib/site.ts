/**
 * Canonical origin for absolute URLs in metadata, sitemaps and share links.
 *
 * Falls back to the Vercel-provided host so preview deployments produce their
 * own absolute URLs rather than pointing at production.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
