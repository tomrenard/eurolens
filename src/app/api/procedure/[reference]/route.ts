import { NextRequest, NextResponse } from "next/server";
import { getProcedureByReference, safeDecodeReference } from "@/lib/procedure";
import { parseLocale } from "@/lib/locale";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const { reference } = await params;
  const decodedReference = safeDecodeReference(reference);

  if (!decodedReference) {
    return NextResponse.json(
      { error: "Reference is malformed" },
      { status: 400 }
    );
  }

  const locale = parseLocale(
    new URL(request.url).searchParams.get("lang")
  );

  try {
    const procedure = await getProcedureByReference(decodedReference, locale);
    return NextResponse.json(procedure);
  } catch (error) {
    console.error("Error fetching procedure:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedure" },
      { status: 500 }
    );
  }
}
