import {
  collectProcedureBasicsForIngest,
  mapWithConcurrency,
  collectVotedProceduresForIngest,
  collectSessionsForIngest,
  fetchProcedureEnrichment,
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

/**
 * How many procedures to fetch detail records for per run.
 *
 * Each one is an upstream request, and the whole invocation has to fit inside
 * the platform's function timeout (60s on Vercel's Hobby plan). The daily
 * schedule works through the backlog over successive runs.
 */
const ENRICH_BATCH_SIZE = 600;

/** Parallel detail requests. Kept modest to stay polite to the EP API. */
const ENRICH_CONCURRENCY = 8;

/** Stop starting new enrichment work past this point in the run. */
const ENRICH_TIME_BUDGET_MS = 40_000;

export interface IngestResult {
  ok: boolean;
  proceduresUpserted: number;
  proceduresEnriched: number;
  proceduresPendingEnrichment: number;
  sessionsUpserted: number;
  error?: string;
  durationMs: number;
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
      proceduresEnriched: 0,
      proceduresPendingEnrichment: 0,
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
    const [basics, voted, sessions] = await Promise.all([
      collectProcedureBasicsForIngest(),
      collectVotedProceduresForIngest(),
      collectSessionsForIngest(),
    ]);

    const now = new Date().toISOString();

    // Phase 1 — listings. `ignoreDuplicates` means a row that has already been
    // enriched keeps its richer values instead of being reset to the sparse
    // listing version on every run.
    const listed = basics.filter((p) => p.reference.length > 0);
    let proceduresUpserted = 0;

    for (const batch of chunk(listed, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("procedures")
        .upsert(batch, { onConflict: "reference", ignoreDuplicates: true });

      if (error) throw new Error(`procedures insert failed: ${error.message}`);
      proceduresUpserted += batch.length;
    }

    // Phase 2 — voted texts. These carry vote counts, so they do overwrite.
    for (const batch of chunk(voted, UPSERT_CHUNK_SIZE)) {
      const { error } = await supabase
        .from("procedures")
        .upsert(
          batch.map((procedure) => ({ ...procedure, ingested_at: now })),
          { onConflict: "reference" }
        );

      if (error) throw new Error(`voted upsert failed: ${error.message}`);
      proceduresUpserted += batch.length;
    }

    // Phase 3 — sessions.
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

    // Phase 4 — enrich a bounded batch of never-enriched rows. The daily
    // schedule works through the backlog across successive runs.
    const { data: pending } = await supabase
      .from("procedures")
      .select("reference, process_id")
      .is("enriched_at", null)
      .limit(ENRICH_BATCH_SIZE);

    // Enrich concurrently: sequentially this managed ~63 rows inside the
    // budget, which would take a month of daily runs to clear the backlog.
    const rows = (pending ?? []) as Array<{
      reference: string;
      process_id: string | null;
    }>;

    const outcomes = await mapWithConcurrency(
      rows,
      ENRICH_CONCURRENCY,
      async (row) => {
        if (Date.now() - startedAt > ENRICH_TIME_BUDGET_MS) return false;

        const enrichment = await fetchProcedureEnrichment(
          row.reference,
          row.process_id
        );

        // Mark even a failed lookup as attempted, so one permanently
        // unresolvable reference cannot block the queue every single run.
        const { error } = await supabase
          .from("procedures")
          .update({
            ...(enrichment ?? {}),
            enriched_at: now,
            ingested_at: now,
          })
          .eq("reference", row.reference);

        return !error && enrichment !== null;
      }
    );

    const proceduresEnriched = outcomes.filter(Boolean).length;

    const { count: stillPending } = await supabase
      .from("procedures")
      .select("reference", { count: "exact", head: true })
      .is("enriched_at", null);

    return finish({
      ok: true,
      proceduresUpserted,
      proceduresEnriched,
      proceduresPendingEnrichment: stillPending ?? 0,
      sessionsUpserted,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    return finish({
      ok: false,
      proceduresUpserted: 0,
      proceduresEnriched: 0,
      proceduresPendingEnrichment: 0,
      sessionsUpserted: 0,
      error: error instanceof Error ? error.message : "Unknown ingest error",
      durationMs: Date.now() - startedAt,
    });
  }
}
