import { NextRequest, NextResponse } from "next/server";
import { getRollCall } from "@/lib/howtheyvote";

/**
 * Individual MEP roll-call votes for a procedure or plenary document.
 *
 * Backed by the HowTheyVote.eu open API. Returns an empty vote list rather
 * than an error when no roll call exists for the reference — most in-progress
 * files have not been voted on yet, which is a normal state, not a failure.
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

  const rollCall = await getRollCall(decodedReference);

  if (!rollCall) {
    return NextResponse.json({ votes: [], rollCall: null });
  }

  return NextResponse.json({ votes: rollCall.votes, rollCall });
}
