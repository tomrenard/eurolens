import { NextRequest, NextResponse } from "next/server";
import { getProcedureByReference } from "@/lib/procedure";

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

  try {
    const procedure = await getProcedureByReference(decodedReference);
    return NextResponse.json(procedure);
  } catch (error) {
    console.error("Error fetching procedure:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedure" },
      { status: 500 }
    );
  }
}
