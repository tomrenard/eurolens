import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveStats, isActionType } from "@/lib/scoring";
import type { UserPosition } from "@/types/gamification";

const MAX_GUEST_POSITIONS = 200;
const MAX_TOTAL_POSITIONS = 1000;
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

  const { count: existingCount } = await supabase
    .from("positions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);

  // MAX_GUEST_POSITIONS was a per-request slice, so repeated calls with fresh
  // ids accumulated without limit. Cap the total a user may hold instead.
  const remainingCapacity = Math.max(
    0,
    MAX_TOTAL_POSITIONS - (existingCount ?? 0)
  );

  const importable = guestPositions
    .filter(
      (position) =>
        typeof position?.procedureId === "string" &&
        position.procedureId.length > 0 &&
        typeof position?.procedureTitle === "string" &&
        position.procedureTitle.length > 0 &&
        VALID_POSITIONS.has(position?.position)
    )
    .slice(0, Math.min(MAX_GUEST_POSITIONS, remainingCapacity));

  for (const position of importable) {
    const actions = Array.isArray(position.actionsTaken)
      ? [...new Set(position.actionsTaken.filter(isActionType))]
      : [];

    // Client-supplied timestamps are clamped to the present: an unbounded
    // value would let a guest backdate or postdate their own history.
    const parsed = Date.parse(position.timestamp ?? "");
    const timestamp =
      Number.isNaN(parsed) || parsed > Date.now()
        ? new Date().toISOString()
        : new Date(parsed).toISOString();

    const reason =
      typeof position.reason === "string"
        ? position.reason.slice(0, MAX_REASON_LENGTH)
        : null;

    const { error } = await supabase.from("positions").upsert(
      {
        user_id: user.id,
        procedure_id: position.procedureId,
        procedure_title: position.procedureTitle.slice(0, 500),
        position: position.position,
        reason,
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



  const stats = deriveStats(rows ?? []);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      stats,
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
