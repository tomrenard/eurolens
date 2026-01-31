import { NextRequest, NextResponse } from "next/server";

const BASE_URL = "https://data.europarl.europa.eu/api/v2";

interface ApiDocumentExpression {
  language: string;
  title?: Record<string, string>;
}

interface ApiDocumentDetail {
  id: string;
  is_realized_by?: ApiDocumentExpression[];
}

interface ApiProcedureDetailed {
  id: string;
  process_id?: string;
  process_type?: string;
  process_title?: Record<string, string>;
  process_summary?: Record<string, string>;
  current_stage?: string;
  consists_of?: Array<{
    activity_date?: string;
    had_activity_type?: string;
  }>;
}

export interface TimelineEvent {
  id: string;
  date: string;
  type: string;
  title: string;
  description?: string;
}

interface ApiResponse<T> {
  data?: T[];
  "@graph"?: T[];
}

function getLocalizedLabel(
  labels: Record<string, string> | undefined,
  lang: string = "en"
): string {
  if (!labels) return "";
  return labels[lang] || labels.en || Object.values(labels)[0] || "";
}

function isDocumentReference(reference: string): boolean {
  return /^[A-Z]\d+-\d+\/\d+$/.test(reference);
}

function isProcedureReference(reference: string): boolean {
  return /^\d{4}\/\d+\([A-Z]+\)$/.test(reference);
}

function convertToDocumentId(reference: string): string | null {
  const match = reference.match(/^([A-Z])(\d+)-(\d+)\/(\d+)$/);
  if (!match) return null;
  const [, letter, term, num, year] = match;
  return `${letter}-${term}-${year}-${num.padStart(4, "0")}`;
}

function convertToProcedureId(reference: string): string {
  const match = reference.match(/^(\d{4})\/(\d+)\([A-Z]+\)$/);
  if (!match) return reference.replace(/\//g, "_").replace(/[()]/g, "");
  const [, year, num] = match;
  return `${year}-${num}`;
}

function getDocumentType(reference: string): string {
  if (reference.startsWith("A")) return "Report";
  if (reference.startsWith("B")) return "Resolution";
  if (reference.startsWith("C")) return "Communication";
  if (isProcedureReference(reference)) {
    const typeMatch = reference.match(/\(([A-Z]+)\)/);
    const typeCode = typeMatch?.[1] || "";
    const typeMap: Record<string, string> = {
      COD: "Codecision",
      CNS: "Consultation",
      NLE: "Non-legislative",
      BUD: "Budget",
      APP: "Consent",
      INI: "Own-initiative",
      INL: "Legislative Initiative",
      RSP: "Resolution",
    };
    return typeMap[typeCode] || "Procedure";
  }
  return "Adopted";
}

function getStageLabel(stage: string | undefined): string {
  if (!stage) return "In Progress";

  const stageMap: Record<string, string> = {
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG1":
      "1st Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG2":
      "2nd Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG3":
      "3rd Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/CONC":
      "Conciliation",
    "http://publications.europa.eu/resource/authority/procedure-phase/FIN":
      "Completed",
  };

  return stageMap[stage] || "In Progress";
}

function getProcedureUrl(reference: string): string {
  return `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=${encodeURIComponent(
    reference
  )}`;
}

async function fetchDocumentDetails(reference: string): Promise<{
  title: string;
  type: string;
  status: string;
  lastActivity?: { date: string; type: string };
} | null> {
  const docId = convertToDocumentId(reference);
  if (!docId) return null;

  try {
    const res = await fetch(
      `${BASE_URL}/plenary-documents/${docId}?format=application%2Fld%2Bjson`,
      {
        headers: { Accept: "application/ld+json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;

    const data: ApiResponse<ApiDocumentDetail> = await res.json();
    const doc = data.data?.[0] || data["@graph"]?.[0];
    if (!doc?.is_realized_by) return null;

    const enExpr = doc.is_realized_by.find((e) => e.language?.includes("/ENG"));
    let title: string | null = null;

    if (enExpr?.title?.en) {
      title = enExpr.title.en;
    } else {
      const first = doc.is_realized_by[0];
      title = first?.title ? (Object.values(first.title)[0] as string) : null;
    }

    if (!title) return null;

    return {
      title,
      type: getDocumentType(reference),
      status: "Adopted",
      lastActivity: {
        date: new Date().toISOString(),
        type: "Voted",
      },
    };
  } catch {
    return null;
  }
}

function buildTimelineFromConsistsOf(
  consists_of: ApiProcedureDetailed["consists_of"]
): TimelineEvent[] {
  if (!consists_of || !Array.isArray(consists_of)) return [];
  const valid = consists_of.filter((a) => a && a.activity_date);
  if (valid.length === 0) return [];
  const sorted = [...valid].sort(
    (a, b) =>
      new Date(b.activity_date!).getTime() -
      new Date(a.activity_date!).getTime()
  );
  return sorted.map((a, idx) => {
    const typeLabel =
      a.had_activity_type?.split("/").pop()?.replace(/_/g, " ") || "Activity";
    return {
      id: `evt-${idx}-${a.activity_date}`,
      date: a.activity_date!,
      type: typeLabel,
      title: typeLabel,
      description: undefined,
    };
  });
}

async function fetchProcedureDetails(reference: string): Promise<{
  title: string;
  summary?: string;
  type: string;
  status: string;
  lastActivity?: { date: string; type: string };
  timeline: TimelineEvent[];
} | null> {
  const procId = convertToProcedureId(reference);

  try {
    const res = await fetch(
      `${BASE_URL}/procedures/${procId}?format=application%2Fld%2Bjson`,
      {
        headers: { Accept: "application/ld+json" },
        next: { revalidate: 3600 },
      }
    );
    if (!res.ok) return null;

    const data: ApiResponse<ApiProcedureDetailed> = await res.json();
    const proc = data.data?.[0] || data["@graph"]?.[0];
    if (!proc) return null;

    const title = getLocalizedLabel(proc.process_title) || reference;
    const summary = getLocalizedLabel(proc.process_summary);
    const status = getStageLabel(proc.current_stage);

    let lastActivity: { date: string; type: string } | undefined;
    const timeline = buildTimelineFromConsistsOf(proc.consists_of);
    if (timeline.length > 0) {
      const latest = timeline[0];
      lastActivity = { date: latest.date, type: latest.type };
    }

    return {
      title,
      summary: summary || undefined,
      type: getDocumentType(reference),
      status,
      lastActivity,
      timeline,
    };
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
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
    let details: {
      title: string;
      summary?: string;
      type: string;
      status: string;
      lastActivity?: { date: string; type: string };
      timeline?: TimelineEvent[];
    } | null = null;

    if (isDocumentReference(decodedReference)) {
      details = await fetchDocumentDetails(decodedReference);
    } else if (isProcedureReference(decodedReference)) {
      details = await fetchProcedureDetails(decodedReference);
    } else {
      details = await fetchDocumentDetails(decodedReference);
      if (!details) {
        details = await fetchProcedureDetails(decodedReference);
      }
    }

    let isFallback = false;
    if (!details) {
      isFallback = true;
      details = {
        title: `Procedure ${decodedReference}`,
        type: getDocumentType(decodedReference),
        status: "In Progress",
        timeline: [],
      };
    }
    if (!("timeline" in details)) {
      (details as { timeline: TimelineEvent[] }).timeline = [];
    }

    const procedure = {
      reference: decodedReference,
      ...details,
      sourceUrl: isFallback ? undefined : getProcedureUrl(decodedReference),
    };

    return NextResponse.json(procedure);
  } catch (error) {
    console.error("Error fetching procedure:", error);
    return NextResponse.json(
      { error: "Failed to fetch procedure" },
      { status: 500 }
    );
  }
}
