import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile, UserStats } from "@/types/gamification";

/** Mirrors the profiles_username_charset / _length constraints in the database. */
const USERNAME_PATTERN = /^[\w \-'\u00C0-\u024F]{1,40}$/u;

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
  if (!supabase) {
    return NextResponse.json({ profile: null });
  }

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
  const { username } = body as { username?: string };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (username !== undefined) {
    const trimmed = typeof username === "string" ? username.trim() : "";

    // Usernames appear on the public leaderboard, so they are bounded and
    // restricted to characters that cannot be used to impersonate markup.
    if (!USERNAME_PATTERN.test(trimmed)) {
      return NextResponse.json(
        {
          error:
            "Username must be 1-40 characters and may contain letters, numbers, spaces, hyphens, underscores and apostrophes",
        },
        { status: 400 }
      );
    }

    updates.username = trimmed;
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
