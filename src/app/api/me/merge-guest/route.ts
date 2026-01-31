import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getLevel } from "@/lib/gamification";
import type {
  UserProfile,
  UserPosition,
  UserStats,
} from "@/types/gamification";

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
  const { profile: guestProfile, positions: guestPositions } = body as {
    profile?: UserProfile;
    positions?: UserPosition[];
  };

  if (!guestProfile || !Array.isArray(guestPositions)) {
    return NextResponse.json(
      { error: "profile and positions are required" },
      { status: 400 }
    );
  }

  const { data: existing } = await supabase
    .from("profiles")
    .select("xp, level, streak, last_active_date, stats, achievements")
    .eq("id", user.id)
    .single();

  const guestXp = guestProfile.xp ?? 0;
  const guestStats = guestProfile.stats ?? ({} as UserStats);
  const guestAchievements = Array.isArray(guestProfile.achievements)
    ? guestProfile.achievements
    : [];

  const serverXp = existing?.xp ?? 0;
  const serverStats = (existing?.stats as UserStats) ?? ({} as UserStats);
  const serverAchievements = Array.isArray(existing?.achievements)
    ? existing.achievements
    : [];

  const mergedXp = Math.max(serverXp, guestXp);
  const mergedLevel = getLevel(mergedXp);
  const mergedStats: UserStats = {
    totalPositions: Math.max(
      serverStats.totalPositions ?? 0,
      guestStats.totalPositions ?? 0
    ),
    mepsContacted: Math.max(
      serverStats.mepsContacted ?? 0,
      guestStats.mepsContacted ?? 0
    ),
    consultationsJoined: Math.max(
      serverStats.consultationsJoined ?? 0,
      guestStats.consultationsJoined ?? 0
    ),
    petitionsSigned: Math.max(
      serverStats.petitionsSigned ?? 0,
      guestStats.petitionsSigned ?? 0
    ),
    proceduresShared: Math.max(
      serverStats.proceduresShared ?? 0,
      guestStats.proceduresShared ?? 0
    ),
    proceduresViewed: Math.max(
      serverStats.proceduresViewed ?? 0,
      guestStats.proceduresViewed ?? 0
    ),
    summariesGenerated: Math.max(
      serverStats.summariesGenerated ?? 0,
      guestStats.summariesGenerated ?? 0
    ),
  };
  const mergedAchievements = [
    ...new Set([...serverAchievements, ...guestAchievements]),
  ];
  const mergedStreak = Math.max(
    existing?.streak ?? 0,
    guestProfile.streak ?? 0
  );
  const mergedLastActive =
    existing?.last_active_date && guestProfile.lastActiveDate
      ? [existing.last_active_date, guestProfile.lastActiveDate].sort()[1]
      : existing?.last_active_date ??
        guestProfile.lastActiveDate ??
        new Date().toISOString().split("T")[0];

  const { error: updateError } = await supabase
    .from("profiles")
    .update({
      xp: mergedXp,
      level: mergedLevel,
      streak: mergedStreak,
      last_active_date: mergedLastActive,
      stats: mergedStats,
      achievements: mergedAchievements,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to merge profile" },
      { status: 500 }
    );
  }

  for (const pos of guestPositions) {
    if (!pos.procedureId || !pos.procedureTitle || !pos.position) continue;
    await supabase.from("positions").upsert(
      {
        user_id: user.id,
        procedure_id: pos.procedureId,
        procedure_title: pos.procedureTitle,
        position: pos.position,
        reason: pos.reason ?? null,
        actions_taken: Array.isArray(pos.actionsTaken) ? pos.actionsTaken : [],
        created_at: pos.timestamp ?? new Date().toISOString(),
      },
      { onConflict: "user_id,procedure_id" }
    );
  }

  return NextResponse.json({ ok: true });
}
