/**
 * Client for the HowTheyVote.eu open API, which publishes European Parliament
 * roll-call votes at the level of individual MEPs.
 *
 * Data is licensed under the Open Database License; individual contents under
 * the Database Contents License. Vote summaries and MEP photographs are
 * excluded from that licence and originate from the European Parliament, so we
 * attribute both sources and do not mirror MEP photographs.
 *
 * The upstream API is documented as experimental. Every function here fails
 * soft: callers get `null` or an empty list rather than an exception, so a
 * roll-call outage can never take down a procedure page.
 */

import type { MEPVote, VoteType, VotingResult } from "@/types/europarl";

const BASE_URL = "https://howtheyvote.eu/api";
const REQUEST_TIMEOUT_MS = 8000;

/** Roll-call results are final once published, so they can be cached hard. */
const REVALIDATE_SECONDS = 60 * 60 * 6;

export const ATTRIBUTION = {
  name: "HowTheyVote.eu",
  url: "https://howtheyvote.eu",
  licence: "Open Database License",
  licenceUrl: "https://opendatacommons.org/licenses/odbl/",
} as const;

/* ------------------------------------------------------------------ *
 * Upstream shapes (only the fields we consume)
 * ------------------------------------------------------------------ */

type UpstreamPosition = "FOR" | "AGAINST" | "ABSTENTION" | "DID_NOT_VOTE";

interface UpstreamGroup {
  code: string;
  label: string;
  short_label: string;
}

interface UpstreamCountry {
  code: string;
  iso_alpha_2: string;
  label: string;
}

interface UpstreamMember {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  country?: UpstreamCountry;
  group?: UpstreamGroup;
}

interface UpstreamMemberVote {
  member: UpstreamMember;
  position: UpstreamPosition;
}

interface UpstreamStatsBucket {
  FOR?: number;
  AGAINST?: number;
  ABSTENTION?: number;
  DID_NOT_VOTE?: number;
}

interface UpstreamVoteSummary {
  id: string;
  is_main: boolean;
  timestamp: string;
  display_title: string;
  description?: string | null;
  reference?: string | null;
  result?: string | null;
  topics?: Array<{ code: string; label: string }>;
  responsible_committees?: Array<{ code: string; abbreviation: string }>;
  procedure?: {
    title?: string;
    type?: string;
    reference?: string;
    stage?: string | null;
  } | null;
}

interface UpstreamVoteDetail extends UpstreamVoteSummary {
  snippet?: { text?: string } | null;
  stats?: {
    total?: UpstreamStatsBucket;
    by_group?: Array<{ group: UpstreamGroup; stats: UpstreamStatsBucket }>;
    by_country?: Array<{ country: UpstreamCountry; stats: UpstreamStatsBucket }>;
  } | null;
  member_votes?: UpstreamMemberVote[];
  sources?: Array<{ url: string; name: string }>;
}

interface UpstreamSearchResponse {
  total: number;
  results: UpstreamVoteSummary[];
}

/* ------------------------------------------------------------------ *
 * Public shapes
 * ------------------------------------------------------------------ */

export interface GroupBreakdown {
  code: string;
  label: string;
  shortLabel: string;
  favor: number;
  against: number;
  abstention: number;
  didNotVote: number;
}

export interface RollCall {
  voteId: string;
  title: string;
  /** Document reference, e.g. `A10-0167/2026`. */
  reference: string | null;
  /** Procedure reference, e.g. `2025/2211(INI)`. */
  procedureReference: string | null;
  date: string;
  result: string | null;
  totals: VotingResult;
  didNotVote: number;
  byGroup: GroupBreakdown[];
  votes: MEPVote[];
  /**
   * Official summary published in the Legislative Observatory, as plain-text
   * paragraphs. Sourced from the European Parliament, not from HowTheyVote.eu's
   * own database, and not covered by the ODbL.
   */
  officialSummary: string[];
  sourceUrl: string;
}

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

function toVoteType(position: UpstreamPosition): VoteType {
  switch (position) {
    case "FOR":
      return "favor";
    case "AGAINST":
      return "against";
    case "ABSTENTION":
      return "abstention";
    case "DID_NOT_VOTE":
      return "did_not_vote";
  }
}

/**
 * Converts the Legislative Observatory's HTML summary into plain-text
 * paragraphs. We deliberately strip rather than sanitise-and-render: nothing
 * in the summary needs markup, and plain text removes the injection surface
 * that rendering third-party HTML would introduce.
 */
function htmlToParagraphs(html: string | undefined | null): string[] {
  if (!html) return [];
  return html
    .split(/<\/p>/i)
    .map((chunk) =>
      chunk
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((text) => text.length > 0);
}

function bucketToBreakdown(
  group: UpstreamGroup,
  stats: UpstreamStatsBucket
): GroupBreakdown {
  return {
    code: group.code,
    label: group.label,
    shortLabel: group.short_label,
    favor: stats.FOR ?? 0,
    against: stats.AGAINST ?? 0,
    abstention: stats.ABSTENTION ?? 0,
    didNotVote: stats.DID_NOT_VOTE ?? 0,
  };
}

async function request<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS, tags: ["howtheyvote"] },
    });

    if (!res.ok) {
      console.warn(`HowTheyVote ${path} responded ${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    console.warn(`HowTheyVote ${path} failed:`, error);
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * API
 * ------------------------------------------------------------------ */

/**
 * Finds the main roll-call vote for a EuroLens reference. Accepts both
 * document references (`A10-0167/2026`) and procedure references
 * (`2025/2211(INI)`) — upstream search resolves either.
 */
export async function findVoteByReference(
  reference: string
): Promise<UpstreamVoteSummary | null> {
  if (!reference.trim()) return null;

  const data = await request<UpstreamSearchResponse>(
    `/votes?q=${encodeURIComponent(reference)}&limit=10`
  );

  if (!data?.results?.length) return null;

  // Prefer the main vote on the whole text over amendment votes.
  return data.results.find((vote) => vote.is_main) ?? data.results[0];
}

export async function getRollCall(
  reference: string
): Promise<RollCall | null> {
  const match = await findVoteByReference(reference);
  if (!match) return null;

  const detail = await request<UpstreamVoteDetail>(`/votes/${match.id}`);
  if (!detail) return null;

  const total = detail.stats?.total ?? {};

  const votes: MEPVote[] = (detail.member_votes ?? []).map((entry) => ({
    mepId: String(entry.member.id),
    name: entry.member.full_name,
    country: entry.member.country?.label ?? "Unknown",
    countryCode: entry.member.country?.iso_alpha_2 ?? "",
    politicalGroup: entry.member.group?.short_label ?? "Non-attached",
    vote: toVoteType(entry.position),
  }));

  return {
    voteId: detail.id,
    title: detail.display_title,
    reference: detail.reference ?? null,
    procedureReference: detail.procedure?.reference ?? null,
    date: detail.timestamp,
    result: detail.result ?? null,
    totals: {
      favor: total.FOR ?? 0,
      against: total.AGAINST ?? 0,
      abstention: total.ABSTENTION ?? 0,
    },
    didNotVote: total.DID_NOT_VOTE ?? 0,
    byGroup: (detail.stats?.by_group ?? []).map((entry) =>
      bucketToBreakdown(entry.group, entry.stats)
    ),
    votes,
    officialSummary: htmlToParagraphs(detail.snippet?.text),
    sourceUrl: `${ATTRIBUTION.url}/votes/${detail.id}`,
  };
}

/**
 * How a country's delegation split on a vote. Powers the
 * "how did my MEPs vote" view without a second request.
 */
export function summariseByCountry(
  rollCall: RollCall,
  countryCode: string
): { votes: MEPVote[]; totals: VotingResult; didNotVote: number } | null {
  if (!countryCode) return null;

  const votes = rollCall.votes.filter(
    (vote) => vote.countryCode === countryCode
  );
  if (votes.length === 0) return null;

  const totals: VotingResult = { favor: 0, against: 0, abstention: 0 };
  let didNotVote = 0;

  for (const vote of votes) {
    if (vote.vote === "did_not_vote") didNotVote++;
    else totals[vote.vote]++;
  }

  return { votes, totals, didNotVote };
}
