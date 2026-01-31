import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { LeaderboardEntry } from "@/types/gamification";

function totalActionsFromStats(stats: Record<string, number> | null): number {
  if (!stats) return 0;
  return (
    (stats.mepsContacted ?? 0) +
    (stats.consultationsJoined ?? 0) +
    (stats.petitionsSigned ?? 0) +
    (stats.proceduresShared ?? 0)
  );
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get("limit")) || 20)
  );
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);

  const { data: rows, error } = await supabase
    .from("profiles")
    .select("id, username, xp, level, stats")
    .order("xp", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }

  const entries: LeaderboardEntry[] = (rows ?? []).map((row, i) => ({
    rank: offset + i + 1,
    userId: row.id,
    username: row.username ?? "EU Citizen",
    xp: row.xp ?? 0,
    level: row.level ?? 1,
    totalActions: totalActionsFromStats(row.stats),
  }));

  return NextResponse.json({ entries });
}
