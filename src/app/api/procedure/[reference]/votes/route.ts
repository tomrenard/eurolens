import { NextRequest, NextResponse } from "next/server";

/**
 * Individual MEP roll-call votes per procedure/decision.
 * EP Open Data API v2 does not expose per-MEP vote data in the same API;
 * roll-call data may exist in OEIL or a separate votes API. This endpoint
 * returns an empty list until a source is integrated.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference);

  if (!decodedReference) {
    return NextResponse.json(
      { error: "Reference is required" },
      { status: 400 }
    );
  }

  return NextResponse.json({ votes: [] });
}
