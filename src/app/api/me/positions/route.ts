import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserPosition, Position, ActionType } from "@/types/gamification";
import { deriveProfile } from "@/lib/scoring";

const MAX_TITLE_LENGTH = 500;
const MAX_REASON_LENGTH = 2000;

function rowToPosition(row: {
  id: string;
  procedure_id: string;
  procedure_title: string;
  position: string;
  reason: string | null;
  actions_taken: string[];
  created_at: string;
}): UserPosition {
  return {
    id: row.id,
    procedureId: row.procedure_id,
    procedureTitle: row.procedure_title,
    position: row.position as Position,
    reason: row.reason ?? undefined,
    actionsTaken: (Array.isArray(row.actions_taken)
      ? row.actions_taken
      : []) as ActionType[],
    timestamp: row.created_at,
  };
}

export async function GET() {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ positions: [] });
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ positions: [] }, { status: 200 });
  }

  const { data: rows, error } = await supabase
    .from("positions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch positions" },
      { status: 500 }
    );
  }

  const positions: UserPosition[] = (rows ?? []).map((r) =>
    rowToPosition({
      ...r,
      actions_taken: Array.isArray(r.actions_taken) ? r.actions_taken : [],
    })
  );
  return NextResponse.json({ positions });
}

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
  const { procedureId, procedureTitle, position, reason } = body as {
    procedureId?: string;
    procedureTitle?: string;
    position?: Position;
    reason?: string;
  };

  if (!procedureId || !procedureTitle || !position) {
    return NextResponse.json(
      { error: "procedureId, procedureTitle, and position are required" },
      { status: 400 }
    );
  }

  if (!["support", "oppose", "neutral"].includes(position)) {
    return NextResponse.json({ error: "Invalid position" }, { status: 400 });
  }

  if (procedureTitle.length > MAX_TITLE_LENGTH) {
    return NextResponse.json({ error: "Title is too long" }, { status: 400 });
  }

  if (reason !== undefined && reason !== null) {
    if (typeof reason !== "string" || reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json(
        { error: `Reason must be a string of at most ${MAX_REASON_LENGTH} characters` },
        { status: 400 }
      );
    }
  }

  const { data: existing } = await supabase
    .from("positions")
    .select("id, actions_taken")
    .eq("user_id", user.id)
    .eq("procedure_id", procedureId)
    .single();

  if (existing) {
    const { data: updated, error } = await supabase
      .from("positions")
      .update({
        procedure_title: procedureTitle,
        position,
        reason: reason ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: "Failed to update position" },
        { status: 500 }
      );
    }
    const pos = rowToPosition({
      ...updated,
      actions_taken: Array.isArray(updated.actions_taken)
        ? updated.actions_taken
        : [],
    });
    return NextResponse.json({ position: pos, xpGained: 0 });
  }

  const { data: inserted, error } = await supabase
    .from("positions")
    .insert({
      user_id: user.id,
      procedure_id: procedureId,
      procedure_title: procedureTitle,
      position,
      reason: reason ?? null,
      actions_taken: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to save position" },
      { status: 500 }
    );
  }

  // Recompute the profile from stored rows rather than incrementing a
  // client-supplied total, so XP is always a function of what the server holds.
  const [{ data: rows }, { data: profileRow }] = await Promise.all([
    supabase
      .from("positions")
      .select("procedure_id, actions_taken")
      .eq("user_id", user.id),
    supabase
      .from("profiles")
      .select("xp, stats, streak")
      .eq("id", user.id)
      .single(),
  ]);

  const carriedStats = (profileRow?.stats ?? {}) as {
    proceduresViewed?: number;
  };

  const derived = deriveProfile(rows ?? [], {
    proceduresViewed: carriedStats.proceduresViewed ?? 0,
    streak: profileRow?.streak ?? 0,
  });

  await supabase
    .from("profiles")
    .update({
      xp: derived.xp,
      level: derived.level,
      stats: derived.stats,
      achievements: derived.achievements,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const pos = rowToPosition({
    ...inserted,
    actions_taken: [],
  });
  return NextResponse.json({
    position: pos,
    xpGained: derived.xp - (profileRow?.xp ?? 0),
    xp: derived.xp,
    level: derived.level,
    achievements: derived.achievements,
  });
}
