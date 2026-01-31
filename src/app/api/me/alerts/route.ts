import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ alerts: [] }, { status: 200 });
  }

  const { data: rows, error } = await supabase
    .from("user_alerts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to fetch alerts" },
      { status: 500 }
    );
  }

  const alerts = (rows ?? []).map((r) => ({
    id: r.id,
    procedureReference: r.procedure_reference,
    topic: r.topic,
    type: r.type,
    channel: r.channel,
    createdAt: r.created_at,
  }));
  return NextResponse.json({ alerts });
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
  const { procedureReference, topic, type, channel } = body as {
    procedureReference?: string;
    topic?: string;
    type?: string;
    channel?: "email" | "in_app";
  };

  if (!type || !channel) {
    return NextResponse.json(
      { error: "type and channel are required" },
      { status: 400 }
    );
  }

  if (!["email", "in_app"].includes(channel)) {
    return NextResponse.json(
      { error: "channel must be email or in_app" },
      { status: 400 }
    );
  }

  const { data: row, error } = await supabase
    .from("user_alerts")
    .insert({
      user_id: user.id,
      procedure_reference: procedureReference ?? null,
      topic: topic ?? null,
      type,
      channel,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create alert" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    alert: {
      id: row.id,
      procedureReference: row.procedure_reference,
      topic: row.topic,
      type: row.type,
      channel: row.channel,
      createdAt: row.created_at,
    },
  });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json(
      { error: "id query parameter is required" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("user_alerts")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to delete alert" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
