import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserStats } from "@/types/gamification";

function rowToProfile(row: {
  id: string;
  username: string;
  xp: number;
  level: number;
  streak: number;
  last_active_date: string;
  stats: UserStats;
  achievements: string[];
  created_at: string;
}): UserProfile {
  return {
    id: row.id,
    username: row.username,
    xp: row.xp,
    level: row.level,
    streak: row.streak,
    lastActiveDate: row.last_active_date,
    stats: row.stats,
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
    createdAt: row.created_at,
  };
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ profile: null }, { status: 200 });
    }
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }

  const profile = rowToProfile({
    ...row,
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
  });
  return NextResponse.json({ profile });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const { username } = body as { username?: string };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof username === "string" && username.trim()) {
    updates.username = username.trim();
  }

  const { data: row, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("id", user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  const profile = rowToProfile({
    ...row,
    achievements: Array.isArray(row.achievements) ? row.achievements : [],
  });
  return NextResponse.json({ profile });
}
