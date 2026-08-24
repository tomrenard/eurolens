import { createClient } from "@/lib/supabase/server";
import { DEFAULT_LOCALE, type ContentLocale } from "@/lib/locale";
import type { LegislativeProcedure, PlenarySession } from "@/types/europarl";

/**
 * Reads from the local mirror filled by the ingest job.
 *
 * Every function returns `null` when the mirror is unavailable or empty —
 * Supabase unconfigured, migrations not applied, or the first ingest not yet
 * run. Callers fall back to reading the European Parliament API live, so the
 * app keeps working with no environment variables at all.
 */

interface ProcedureRow {
  reference: string;
  titles: Record<string, string> | null;
  summaries: Record<string, string> | null;
  type: string;
  status: string;
  committees: string[] | null;
  source_url: string | null;
  last_activity_date: string | null;
  last_activity_type: string | null;
  is_completed: boolean;
  votes_favor: number | null;
  votes_against: number | null;
  votes_abstention: number | null;
}

interface SessionRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

function pickLocalized(
  values: Record<string, string> | null,
  locale: ContentLocale
): string | undefined {
  if (!values) return undefined;
  return values[locale] || values.en || Object.values(values)[0] || undefined;
}

function rowToProcedure(
  row: ProcedureRow,
  locale: ContentLocale
): LegislativeProcedure {
  const hasVotes =
    row.votes_favor !== null ||
    row.votes_against !== null ||
    row.votes_abstention !== null;

  return {
    id: row.reference,
    reference: row.reference,
    title: pickLocalized(row.titles, locale) ?? row.reference,
    summary: pickLocalized(row.summaries, locale),
    type: row.type,
    status: row.status,
    subjects: row.committees ?? [],
    sourceUrl: row.source_url ?? undefined,
    votingResult: hasVotes
      ? {
          favor: row.votes_favor ?? 0,
          against: row.votes_against ?? 0,
          abstention: row.votes_abstention ?? 0,
        }
      : undefined,
    lastActivity: row.last_activity_date
      ? {
          date: row.last_activity_date,
          type: row.last_activity_type ?? "Activity",
        }
      : undefined,
  };
}

const SELECT_COLUMNS =
  "reference, titles, summaries, type, status, committees, source_url, last_activity_date, last_activity_type, is_completed, votes_favor, votes_against, votes_abstention";

export interface StoredProceduresOptions {
  locale?: ContentLocale;
  limit?: number;
  /** Free-text search over the English title, matched server-side. */
  search?: string;
}

export async function getStoredInProgressProcedures({
  locale = DEFAULT_LOCALE,
  limit = 60,
  search,
}: StoredProceduresOptions = {}): Promise<LegislativeProcedure[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  let query = supabase
    .from("procedures")
    .select(SELECT_COLUMNS)
    .eq("is_completed", false)
    .order("last_activity_date", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (search?.trim()) {
    query = query.ilike("titles->>en", `%${search.trim()}%`);
  }

  const { data, error } = await query;

  if (error || !data?.length) return null;

  return (data as ProcedureRow[]).map((row) => rowToProcedure(row, locale));
}

export async function getStoredCompletedProcedures({
  locale = DEFAULT_LOCALE,
  limit = 30,
}: StoredProceduresOptions = {}): Promise<LegislativeProcedure[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("procedures")
    .select(SELECT_COLUMNS)
    .eq("is_completed", true)
    .order("voted_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data?.length) return null;

  return (data as ProcedureRow[]).map((row) => rowToProcedure(row, locale));
}

export async function getStoredUpcomingSessions(): Promise<
  PlenarySession[] | null
> {
  const supabase = await createClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("plenary_sessions")
    .select("id, title, start_date, end_date")
    .gte("start_date", new Date().toISOString())
    .order("start_date", { ascending: true })
    .limit(10);

  if (error || !data?.length) return null;

  return (data as SessionRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    type: "Plenary Session",
  }));
}

/** PostgREST caps a response at 1000 rows regardless of `.limit()`. */
const PAGE_SIZE = 1000;

/** Hard ceiling, well under the 50,000-URL sitemap limit. */
const MAX_SITEMAP_REFERENCES = 45000;

/**
 * Every reference in the mirror, for the sitemap.
 *
 * Pages explicitly: a single `.limit(5000)` silently returned only the first
 * 1000 rows, so the sitemap listed 1000 procedures out of 2164 and the rest
 * were never offered to search engines.
 */
export async function getStoredReferences(): Promise<string[] | null> {
  const supabase = await createClient();
  if (!supabase) return null;

  const references: string[] = [];

  for (let offset = 0; offset < MAX_SITEMAP_REFERENCES; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("procedures")
      .select("reference")
      .order("reference", { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);

    if (error) break;
    if (!data?.length) break;

    references.push(...(data as { reference: string }[]).map((r) => r.reference));

    if (data.length < PAGE_SIZE) break;
  }

  return references.length > 0 ? references : null;
}
