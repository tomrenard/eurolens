import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserPosition, Position, ActionType } from "@/types/gamification";
import { getLevel } from "@/lib/gamification";
import { XP_REWARDS } from "@/types/gamification";

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
        created_at: new Date().toISOString(),
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

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("xp, stats")
    .eq("id", user.id)
    .single();

  const currentXp = profileRow?.xp ?? 0;
  const newXp = currentXp + XP_REWARDS.STATE_POSITION;
  const level = getLevel(newXp);
  const stats = (profileRow?.stats as Record<string, number>) ?? {};
  const totalPositions = (stats.totalPositions ?? 0) + 1;

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

  await supabase
    .from("profiles")
    .update({
      xp: newXp,
      level,
      stats: { ...stats, totalPositions },
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  const pos = rowToPosition({
    ...inserted,
    actions_taken: [],
  });
  return NextResponse.json({
    position: pos,
    xpGained: XP_REWARDS.STATE_POSITION,
  });
}
