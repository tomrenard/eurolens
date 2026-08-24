import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * EuroLens loads no third-party scripts and no remote images, so the origin
 * allowlist is narrow.
 *
 * Be clear about the limit, though: `script-src` carries `'unsafe-inline'`
 * because Next's hydration bootstrap is an inline script, and that also
 * permits inline event handlers — so this policy restricts *where scripts come
 * from*, not whether injected markup can run. It is defence in depth behind
 * output escaping, not a substitute for it. Tightening it further means
 * emitting a per-request nonce from the proxy and threading it through Next's
 * script tags.
 *
 * React Fast Refresh compiles with `eval`, so development additionally needs
 * `'unsafe-eval'`; production does not get it.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Supabase (auth) and the two open data APIs.
  `connect-src 'self' https://*.supabase.co https://data.europarl.europa.eu https://howtheyvote.eu${
    isDev ? " ws://localhost:* http://localhost:*" : ""
  }`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
