import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { deriveStats, isActionType, parseActions } from "@/lib/scoring";

/**
 * Records a civic action against a position the user already holds.
 *
 * Actions were previously written to localStorage and their XP computed on the
 * client. They are now stored on the position row and the whole profile is
 * recomputed from those rows, so a given action counts once per procedure and
 * cannot be replayed for more XP.
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
  const { procedureId, action } = body as {
    procedureId?: string;
    action?: string;
  };

  if (!procedureId || !isActionType(action)) {
    return NextResponse.json(
      { error: "procedureId and a valid action are required" },
      { status: 400 }
    );
  }

  const { data: position } = await supabase
    .from("positions")
    .select("id, actions_taken")
    .eq("user_id", user.id)
    .eq("procedure_id", procedureId)
    .single();

  if (!position) {
    return NextResponse.json(
      { error: "State your position on this procedure first" },
      { status: 404 }
    );
  }

  const existingActions = parseActions(position.actions_taken);
  const alreadyRecorded = existingActions.includes(action);

  if (!alreadyRecorded) {
    // Read-modify-write on a JSON column: two concurrent requests for
    // different actions can interleave and lose one. Re-read immediately
    // before writing and merge, which narrows the window to near zero without
    // needing a stored procedure. A lost action under-counts rather than
    // over-counts, so this is the conservative direction to fail in.
    const { data: fresh } = await supabase
      .from("positions")
      .select("actions_taken")
      .eq("id", position.id)
      .single();

    const merged = [
      ...new Set([...parseActions(fresh?.actions_taken), action]),
    ];

    const { error } = await supabase
      .from("positions")
      .update({ actions_taken: merged })
      .eq("id", position.id);

    if (error) {
      return NextResponse.json(
        { error: "Failed to record action" },
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
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ recorded: !alreadyRecorded, stats });
}
