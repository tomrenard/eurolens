import { ImageResponse } from "next/og";
import { getProcedureByReference, safeDecodeReference } from "@/lib/procedure";
import { explain } from "@/lib/explainer";

export const alt = "EuroLens procedure summary";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Share card for a procedure.
 *
 * Every share of a EuroLens link becomes a small legible summary of the file,
 * which is the cheapest organic reach available to a project with no ad budget.
 */
export default async function Image({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference: raw } = await params;
  const reference = safeDecodeReference(raw) ?? "";
  const procedure = await getProcedureByReference(reference);
  const explanation = explain({
    id: procedure.reference,
    reference: procedure.reference,
    title: procedure.title,
    type: procedure.type,
    status: procedure.status,
    subjects: [],
  });

  const title =
    procedure.title.length > 120
      ? `${procedure.title.slice(0, 117)}…`
      : procedure.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#003399",
          color: "#ffffff",
          padding: "64px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              fontSize: 26,
              opacity: 0.85,
            }}
          >
            <span style={{ letterSpacing: "0.12em" }}>EUROLENS</span>
            <span>·</span>
            <span style={{ fontFamily: "monospace" }}>
              {procedure.reference}
            </span>
          </div>

          <div style={{ display: "flex", fontSize: 56, lineHeight: 1.15 }}>
            {title}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: 28, opacity: 0.9 }}>
            {explanation.stage}
          </div>
          <div
            style={{
              display: "flex",
              gap: "16px",
              fontSize: 24,
              opacity: 0.75,
            }}
          >
            <span>{procedure.type}</span>
            <span>·</span>
            <span>{procedure.status}</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
