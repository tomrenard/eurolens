import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveProfile, isActionType } from "@/lib/scoring";
import type { UserPosition } from "@/types/gamification";

const MAX_GUEST_POSITIONS = 200;
const MAX_REASON_LENGTH = 2000;
const VALID_POSITIONS = new Set(["support", "oppose", "neutral"]);

/**
 * Promotes a guest's locally stored positions into their account on first
 * sign-in.
 *
 * Only the positions themselves are imported. XP, level, stats and
 * achievements are recomputed from the resulting rows, never taken from the
 * request: the previous version merged client-supplied XP with `Math.max`,
 * which let anyone edit localStorage and post an arbitrary score to the
 * public leaderboard.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Accounts are not enabled on this deployment" },
      { status: 503 }
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { positions: guestPositions } = body as {
    positions?: UserPosition[];
  };

  if (!Array.isArray(guestPositions)) {
    return NextResponse.json(
      { error: "positions is required" },
      { status: 400 }
    );
  }

  const importable = guestPositions
    .filter(
      (position) =>
        typeof position?.procedureId === "string" &&
        position.procedureId.length > 0 &&
        typeof position?.procedureTitle === "string" &&
        position.procedureTitle.length > 0 &&
        VALID_POSITIONS.has(position?.position)
    )
    .slice(0, MAX_GUEST_POSITIONS);

  for (const position of importable) {
    const actions = Array.isArray(position.actionsTaken)
      ? [...new Set(position.actionsTaken.filter(isActionType))]
      : [];

    const timestamp = Number.isNaN(Date.parse(position.timestamp ?? ""))
      ? new Date().toISOString()
      : new Date(position.timestamp).toISOString();

    const { error } = await supabase.from("positions").upsert(
      {
        user_id: user.id,
        procedure_id: position.procedureId,
        procedure_title: position.procedureTitle.slice(0, 500),
        position: position.position,
        reason: position.reason?.slice(0, MAX_REASON_LENGTH) ?? null,
        actions_taken: actions,
        created_at: timestamp,
      },
      { onConflict: "user_id,procedure_id" }
    );

    if (error) {
      return NextResponse.json(
        { error: "Failed to import positions" },
        { status: 500 }
      );
    }
  }

  const { data: rows } = await supabase
    .from("positions")
    .select("procedure_id, actions_taken")
    .eq("user_id", user.id);

  const { data: existing } = await supabase
    .from("profiles")
    .select("stats, streak")
    .eq("id", user.id)
    .single();

  const carriedStats = (existing?.stats ?? {}) as { proceduresViewed?: number };

  const derived = deriveProfile(rows ?? [], {
    proceduresViewed: carriedStats.proceduresViewed ?? 0,
    streak: existing?.streak ?? 0,
  });

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      xp: derived.xp,
      level: derived.level,
      stats: derived.stats,
      achievements: derived.achievements,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to merge profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, imported: importable.length });
}
