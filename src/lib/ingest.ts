import {
  collectProceduresForIngest,
  collectVotedProceduresForIngest,
  collectSessionsForIngest,
  type IngestProcedure,
} from "@/lib/europarl";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fills the local mirror from the European Parliament Open Data API.
 *
 * Runs on a schedule rather than per request. Every read path can then hit one
 * indexed query instead of fanning out to an upstream API whose slowest
 * endpoint returns several megabytes.
 */

const UPSERT_CHUNK_SIZE = 100;

export interface IngestResult {
  ok: boolean;
  proceduresUpserted: number;
  sessionsUpserted: number;
  error?: string;
  durationMs: number;
}

/**
 * Merges the in-progress and voted collections.
 *
 * A file can appear in both — it was tracked while in progress and has since
 * been voted on. The voted record wins for vote fields, but the in-progress
 * record usually holds the richer multilingual title and committee list, so
 * the two are combined rather than one replacing the other.
 */
function mergeProcedures(
  inProgress: IngestProcedure[],
  voted: IngestProcedure[]
): IngestProcedure[] {
  const merged = new Map<string, IngestProcedure>();

  for (const procedure of inProgress) {
    merged.set(procedure.reference, procedure);
  }

  for (const procedure of voted) {
    const existing = merged.get(procedure.reference);

    if (!existing) {
      merged.set(procedure.reference, procedure);
      continue;
    }

    merged.set(procedure.reference, {
      ...existing,
      status: procedure.status,
      is_completed: true,
      votes_favor: procedure.votes_favor,
      votes_against: procedure.votes_against,
      votes_abstention: procedure.votes_abstention,
      voted_at: procedure.voted_at,
      last_activity_date:
        procedure.last_activity_date ?? existing.last_activity_date,
      last_activity_type:
        procedure.last_activity_type ?? existing.last_activity_type,
      titles: Object.keys(existing.titles).length
        ? existing.titles
        : procedure.titles,
    });
  }

  return [...merged.values()];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export async function runIngest(): Promise<IngestResult> {
  const startedAt = Date.now();
  const supabase = createAdminClient();

  if (!supabase) {
    return {
      ok: false,
      proceduresUpserted: 0,
      sessionsUpserted: 0,
      error: "Supabase service role is not configured",
      durationMs: Date.now() - startedAt,
    };
  }

  const { data: run } = await supabase
    .from("ingest_runs")
    .insert({})
    .select("id")
    .single();

  const runId = run?.id as string | undefined;

  async function finish(result: IngestResult): Promise<IngestResult> {
    if (runId) {
      await supabase!
        .from("ingest_runs")
        .update({
          finished_at: new Date().toISOString(),
          ok: result.ok,
          procedures_upserted: result.proceduresUpserted,
          sessions_upserted: result.sessionsUpserted,
          error: result.error ?? null,
        })
        .eq("id", runId);
    }
    return result;
  }

  try {
    // Collected in parallel: they hit different upstream endpoints, and a
    // failure in either should fail the run rather than half-fill the mirror.
    const [inProgress, voted, sessions] = await Promise.all([
      collectProceduresForIngest(),
      collectVotedProceduresForIngest(),
      collectSessionsForIngest(),
    ]);

    const procedures = mergeProcedures(inProgress, voted).filter(
      (procedure) => procedure.reference.length > 0
    );

    const now = new Date().toISOString();
    let proceduresUpserted = 0;

    for (const batch of chunk(procedures, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("procedures")
        .upsert(
          batch.map((procedure) => ({ ...procedure, ingested_at: now })),
          { onConflict: "reference" }
        );

      if (error) throw new Error(`procedures upsert failed: ${error.message}`);
      proceduresUpserted += batch.length;
    }

    let sessionsUpserted = 0;

    for (const batch of chunk(sessions, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("plenary_sessions")
        .upsert(
          batch.map((session) => ({ ...session, ingested_at: now })),
          { onConflict: "id" }
        );

      if (error) throw new Error(`sessions upsert failed: ${error.message}`);
      sessionsUpserted += batch.length;
    }

    return finish({
      ok: true,
      proceduresUpserted,
      sessionsUpserted,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return finish({
      ok: false,
      proceduresUpserted: 0,
      sessionsUpserted: 0,
      error: error instanceof Error ? error.message : "Unknown ingest error",
      durationMs: Date.now() - startedAt,
    });
  }
}
