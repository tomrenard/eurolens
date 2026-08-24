import { createServerClient } from "@supabase/ssr";
import { isPlausibleReference, safeDecodeReference } from "@/lib/reference";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next throws a URIError while decoding a dynamic route segment that contains
 * malformed percent-encoding (`/procedure/%E0%A4%A`), which surfaces as a 500
 * before any route handler runs. Catch it here, where the raw pathname is
 * still available, and answer with a 400 instead.
 */
function hasMalformedEncoding(pathname: string): boolean {
  try {
    decodeURIComponent(pathname);
    return false;
  } catch {
    return true;
  }
}

/**
 * Whether a `/procedure/...` path names something reference-shaped.
 *
 * The page also guards this, but `notFound()` inside a dynamic route renders
 * the 404 body with a 200 status — a soft 404, which invites search engines to
 * index junk URLs. Deciding here means the status code is right.
 */
function isUnknownProcedurePath(pathname: string): boolean {
  const match = pathname.match(/^\/procedure\/([^/]+)(?:\/opengraph-image)?$/);
  if (!match) return false;

  const reference = safeDecodeReference(match[1]);
  return !reference || !isPlausibleReference(reference);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (hasMalformedEncoding(pathname)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  if (isUnknownProcedurePath(pathname)) {
    return NextResponse.rewrite(new URL("/procedure-not-found", request.url), {
      status: 404,
    });
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );
    void supabase.auth.getUser();
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
