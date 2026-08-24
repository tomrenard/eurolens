import { NextRequest, NextResponse } from "next/server";
import { runIngest } from "@/lib/ingest";
import { revalidateTag } from "next/cache";

/**
 * Scheduled ingest endpoint, triggered by Vercel Cron (see vercel.json).
 *
 * Guarded by CRON_SECRET rather than left open: it is expensive, it writes,
 * and an unauthenticated trigger would let anyone hammer the European
 * Parliament's API through us.
 */
/** Tags attached to the upstream fetches this job supersedes. */
const CACHE_TAGS = [
  "europarl-procedures",
  "europarl-meetings",
  "europarl-decisions",
] as const;

export const maxDuration = 300;
export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;

  // Refuse rather than run openly when no secret is configured.
  if (!secret) return false;

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runIngest();

  if (result.ok) {
    // Drop the cached upstream responses so the next render reads fresh rows.
    // Next 16 requires a cache profile alongside the tag; "max" expires the
    // entry immediately, which is what a completed ingest wants.
    for (const tag of CACHE_TAGS) {
      revalidateTag(tag, "max");
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 500 });
}
