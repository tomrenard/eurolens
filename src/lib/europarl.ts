import { unstable_cache } from "next/cache";
import type { PlenarySession, LegislativeProcedure } from "@/types/europarl";
import { DEFAULT_LOCALE, type ContentLocale } from "@/lib/locale";
import { apiCache, getCacheKey } from "@/lib/cache";

const BASE_URL = "https://data.europarl.europa.eu/api/v2";
const CACHE_TTL = 10 * 60 * 1000;

/**
 * Maximum number of detail requests we will have in flight against the EP API
 * at once. Without a cap, a page with many procedures fans out one request per
 * item and a single slow upstream response stalls the whole section.
 */
const MAX_CONCURRENT_DETAIL_REQUESTS = 6;

/**
 * Runs `worker` over `items` with bounded concurrency, preserving input order.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;

  async function run(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, run)
  );

  return results;
}

interface ApiMeeting {
  id: string;
  type: string;
  activity_date?: string;
  activity_start_date?: string;
  activity_end_date?: string;
  activity_id?: string;
  activity_label?: Record<string, string>;
  had_activity_type?: string;
  parliamentary_term?: string;
}

interface ApiProcedureBasic {
  id: string;
  type: string;
  process_id?: string;
  process_type?: string;
  label?: string;
}

interface ApiProcedureDetailed {
  id: string;
  type: string;
  process_id?: string;
  process_type?: string;
  label?: string;
  process_title?: Record<string, string>;
  process_summary?: Record<string, string>;
  current_stage?: string;
  consists_of?: Array<{
    activity_date?: string;
    had_activity_type?: string;
  }>;
  had_participation?: Array<{
    had_participant_organization?: string | string[];
    participation_role?: string;
  }>;
}

interface ApiResponse<T> {
  data?: T[];
  "@graph"?: T[];
  "@context"?: unknown;
}

interface ApiDecision {
  id: string;
  activity_date?: string;
  activity_id?: string;
  activity_label?: Record<string, string>;
  decision_outcome?: string;
  number_of_votes_favor?: number;
  number_of_votes_against?: number;
  number_of_votes_abstention?: number;
  referenceText?: Record<string, string>;
}

function getLocalizedLabel(
  labels: Record<string, string> | undefined,
  lang: ContentLocale = DEFAULT_LOCALE
): string {
  if (!labels) return "";
  return labels[lang] || labels.en || Object.values(labels)[0] || "";
}

function isProcedureReference(reference: string): boolean {
  return /^\d{4}\/\d+\([A-Z]+\)$/.test(reference);
}

function convertProcedureIdToReference(procId: string): string | null {
  const match = procId.match(/^(\d{4})_(\d+)_([A-Z]+)$/);
  if (!match) return null;
  const [, year, num, type] = match;
  return `${year}/${parseInt(num, 10)}(${type})`;
}

function getProcedureTypeLabel(type: string | undefined): string {
  if (!type) return "Procedure";

  const typeMap: Record<string, string> = {
    "def/ep-procedure-types/COD": "Codecision",
    "def/ep-procedure-types/CNS": "Consultation",
    "def/ep-procedure-types/NLE": "Non-legislative",
    "def/ep-procedure-types/BUD": "Budget",
    "def/ep-procedure-types/APP": "Consent",
    "def/ep-procedure-types/INI": "Own-initiative",
    "def/ep-procedure-types/INL": "Legislative Initiative",
    "def/ep-procedure-types/RSP": "Resolution",
    "def/ep-procedure-types/SYN": "Cooperation",
    "def/ep-procedure-types/IMM": "Immunity",
    "def/ep-procedure-types/REG": "Rules of Procedure",
    "def/ep-procedure-types/DCE": "Discharge",
  };

  return typeMap[type] || type.split("/").pop() || "Procedure";
}

function getStageLabel(stage: string | undefined): string {
  if (!stage) return "Active";

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

function extractCommittees(
  participation: ApiProcedureDetailed["had_participation"]
): string[] {
  if (!participation || !Array.isArray(participation)) return [];

  const committeeRoles = [
    "def/ep-roles/COMMITTEE_RESPONSIBLE",
    "def/ep-roles/COMMITTEE_OPINION",
  ];

  const committees: string[] = [];

  for (const p of participation) {
    if (!p) continue;
    if (p.participation_role && committeeRoles.includes(p.participation_role)) {
      const orgs = p.had_participant_organization;
      if (orgs) {
        const orgArray = Array.isArray(orgs) ? orgs : [orgs];
        for (const org of orgArray) {
          if (typeof org === "string") {
            const name = org.split("/").pop();
            if (name && !committees.includes(name)) {
              committees.push(name);
            }
          }
        }
      }
    }
  }

  return committees;
}

function getLatestActivity(
  consists_of: ApiProcedureDetailed["consists_of"]
): { date: string; type: string } | undefined {
  if (!consists_of || !Array.isArray(consists_of) || consists_of.length === 0)
    return undefined;

  const validActivities = consists_of.filter((a) => a && a.activity_date);
  if (validActivities.length === 0) return undefined;

  const sorted = validActivities.sort(
    (a, b) =>
      new Date(b.activity_date!).getTime() -
      new Date(a.activity_date!).getTime()
  );

  const latest = sorted[0];
  const activityType =
    latest.had_activity_type?.split("/").pop()?.replace(/_/g, " ") ||
    "Activity";

  return {
    date: latest.activity_date!,
    type: activityType,
  };
}

export async function getMeetings(): Promise<ApiResponse<ApiMeeting>> {
  const currentYear = new Date().getFullYear();
  const res = await fetch(
    `${BASE_URL}/meetings?format=application%2Fld%2Bjson&offset=0&limit=20&year=${currentYear}`,
    {
      headers: {
        Accept: "application/ld+json",
      },
      next: { revalidate: 3600, tags: ["europarl-meetings"] },
    }
  );

  if (!res.ok) {
    throw new Error(
      `Failed to fetch meetings: ${res.status} ${res.statusText}`
    );
  }

  return res.json();
}

async function fetchProceduresByYear(
  year: number
): Promise<ApiProcedureBasic[]> {
  const cacheKey = getCacheKey("procedures-year", year);
  const cached = apiCache.get<ApiProcedureBasic[]>(cacheKey);
  if (cached) return cached;

  const res = await fetch(
    `${BASE_URL}/procedures?format=application%2Fld%2Bjson&offset=0&limit=15&year=${year}`,
    {
      headers: {
        Accept: "application/ld+json",
      },
      next: { revalidate: 3600, tags: ["europarl-procedures"] },
    }
  );

  if (!res.ok) {
    console.warn(`Failed to fetch procedures for year ${year}: ${res.status}`);
    return [];
  }

  const data: ApiResponse<ApiProcedureBasic> = await res.json();
  const procedures = data.data || data["@graph"] || [];

  apiCache.set(cacheKey, procedures, CACHE_TTL);
  return procedures;
}

export async function getProcedures(): Promise<ApiResponse<ApiProcedureBasic>> {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const [currentYearProcedures, previousYearProcedures] = await Promise.all([
    fetchProceduresByYear(currentYear),
    fetchProceduresByYear(previousYear),
  ]);

  const combined = [...currentYearProcedures, ...previousYearProcedures];

  return { data: combined };
}

async function fetchPlenaryMeetings(year: number): Promise<ApiMeeting[]> {
  const cacheKey = getCacheKey("plenary-meetings", year);
  const cached = apiCache.get<ApiMeeting[]>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE_URL}/meetings?format=application%2Fld%2Bjson&offset=0&limit=150&year=${year}`,
      {
        headers: { Accept: "application/ld+json" },
        next: { revalidate: 300, tags: ["europarl-meetings"] },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch meetings for year ${year}: ${res.status}`);
      return [];
    }

    const data: ApiResponse<ApiMeeting> = await res.json();
    const meetings = data.data || data["@graph"] || [];

    const plenaryMeetings = meetings.filter((m) => {
      if (!m.had_activity_type) return true;
      const type = m.had_activity_type.toUpperCase();
      return (
        type.includes("PLENARY") ||
        type.includes("SITTING") ||
        type.includes("SESSION")
      );
    });

    apiCache.set(cacheKey, plenaryMeetings, CACHE_TTL);
    return plenaryMeetings;
  } catch (error) {
    console.warn(`Error fetching plenary meetings for year ${year}:`, error);
    return [];
  }
}

async function fetchMeetingDecisions(
  meetingId: string
): Promise<ApiDecision[]> {
  try {
    // This payload runs to several megabytes, past the Next data cache's 2MB
    // per-entry limit, so caching the raw response silently fails on every
    // build. Fetch it uncached and cache the handful of records we keep.
    const res = await fetch(
      `${BASE_URL}/meetings/${meetingId}/decisions?format=application%2Fld%2Bjson`,
      {
        headers: { Accept: "application/ld+json" },
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      }
    );

    if (!res.ok) {
      return [];
    }

    const data: ApiResponse<ApiDecision> = await res.json();
    const decisions = data.data || data["@graph"] || [];

    return decisions.filter((d) => {
      if (!d.decision_outcome) return (d.number_of_votes_favor || 0) > 0;
      return d.decision_outcome.toUpperCase().includes("ADOPTED");
    });
  } catch {
    return [];
  }
}

async function loadRecentPlenaryDecisions(): Promise<ApiDecision[]> {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const [currentYearMeetings, previousYearMeetings] = await Promise.all([
    fetchPlenaryMeetings(currentYear),
    fetchPlenaryMeetings(previousYear),
  ]);

  const allMeetings = [...currentYearMeetings, ...previousYearMeetings];

  const now = new Date();
  const sixMonthsAgo = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);

  const recentMeetings = allMeetings
    .filter((m) => {
      const dateStr = m.activity_start_date || m.activity_date;
      if (!dateStr) return false;
      const meetingDate = new Date(dateStr);
      return (
        !isNaN(meetingDate.getTime()) &&
        meetingDate <= now &&
        meetingDate >= sixMonthsAgo
      );
    })
    .sort((a, b) => {
      const dateA = new Date(
        a.activity_start_date || a.activity_date || 0
      ).getTime();
      const dateB = new Date(
        b.activity_start_date || b.activity_date || 0
      ).getTime();
      return dateB - dateA;
    })
    .slice(0, 5);

  const decisionsPromises = recentMeetings.map((m) => {
    const meetingId = m.activity_id || m.id.split("/").pop() || "";
    return fetchMeetingDecisions(meetingId);
  });

  const decisionsArrays = await Promise.all(decisionsPromises);
  const allDecisions = decisionsArrays.flat();

  return allDecisions
    .sort((a, b) => {
      const dateA = a.activity_date ? new Date(a.activity_date).getTime() : 0;
      const dateB = b.activity_date ? new Date(b.activity_date).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 20);
}

/**
 * Caches the reduced decision list — twenty small records — rather than the
 * multi-megabyte responses it was derived from, so the result survives across
 * requests and instances instead of living only in per-process memory.
 */
const getRecentPlenaryDecisions = unstable_cache(
  loadRecentPlenaryDecisions,
  ["recent-plenary-decisions"],
  { revalidate: 900, tags: ["europarl-decisions"] }
);

function getProcedureUrl(reference: string): string {
  return `https://oeil.secure.europarl.europa.eu/oeil/en/procedure-file?reference=${encodeURIComponent(
    reference
  )}`;
}

function isDocumentReference(reference: string): boolean {
  return /^[A-Z]\d+-\d+\/\d+$/.test(reference);
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

interface ApiDocumentExpression {
  language?: string;
  title?: Record<string, string>;
}

interface ApiDocumentDetail {
  id: string;
  is_realized_by?: ApiDocumentExpression[];
}

async function fetchPlenaryDocumentTitle(
  reference: string,
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<string | null> {
  const cacheKey = getCacheKey("plenary-doc-title", locale, reference);
  const cached = apiCache.get<string>(cacheKey);
  if (cached != null) return cached;

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
    if (!doc?.is_realized_by?.length) return null;

    // Prefer the requested language, then English, then whatever exists.
    const localized = doc.is_realized_by
      .map((expression) => expression.title?.[locale])
      .find((value): value is string => Boolean(value));

    const english = doc.is_realized_by.find((e) =>
      e.language?.includes("/ENG")
    )?.title?.en;

    const fallback = doc.is_realized_by
      .map((expression) =>
        expression.title ? Object.values(expression.title)[0] : undefined
      )
      .find((value): value is string => Boolean(value));

    const title = localized ?? english ?? fallback ?? null;
    if (!title) return null;

    apiCache.set(cacheKey, title, CACHE_TTL);
    return title;
  } catch {
    return null;
  }
}

async function fetchFullTitleForReference(
  reference: string,
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<string | null> {
  const cacheKey = getCacheKey("procedure-full-title", locale, reference);
  const cached = apiCache.get<string>(cacheKey);
  if (cached != null) return cached;

  let title: string | null = null;
  if (isDocumentReference(reference)) {
    title = await fetchPlenaryDocumentTitle(reference, locale);
  } else if (isProcedureReference(reference)) {
    const procId = convertToProcedureId(reference);
    const proc = await getProcedureDetails(procId);
    title = proc ? getLocalizedLabel(proc.process_title, locale) || null : null;
  } else {
    title = await fetchPlenaryDocumentTitle(reference, locale);
    if (!title) {
      const procId = convertToProcedureId(reference);
      const proc = await getProcedureDetails(procId);
      title = proc
        ? getLocalizedLabel(proc.process_title, locale) || null
        : null;
    }
  }

  if (title) apiCache.set(cacheKey, title, CACHE_TTL);
  return title;
}

function extractReferenceFromLabel(label: string | undefined): string {
  if (!label) return "";
  const trimmed = label.trim();

  const docMatch = trimmed.match(/([A-Z]\d+-\d+\/\d+)/);
  if (docMatch) return docMatch[1];

  const procMatch = trimmed.match(/(\d{4}\/\d+\([A-Z]+\))/);
  if (procMatch) return procMatch[1];

  const altDocMatch = trimmed.match(/([A-Z]\d+-\d{4}-\d+)/);
  if (altDocMatch) return altDocMatch[1];

  if (/^[A-Z]\d+-\d+\/\d+$/.test(trimmed)) return trimmed;
  if (/^\d{4}\/\d+\([A-Z]+\)$/.test(trimmed)) return trimmed;

  return "";
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

function transformDecisionsLight(
  decisions: ApiDecision[]
): LegislativeProcedure[] {
  const grouped = new Map<string, { dec: ApiDecision; label: string }>();

  for (const dec of decisions) {
    const label = getLocalizedLabel(dec.activity_label);
    const reference = extractReferenceFromLabel(label);

    if (!reference) continue;

    const existing = grouped.get(reference);
    const hasVotes = (dec.number_of_votes_favor || 0) > 0;
    if (!existing || hasVotes) {
      grouped.set(reference, { dec, label });
    }
  }

  return Array.from(grouped.entries()).map(([ref, { dec, label }]) => {
    const afterRef = label.startsWith(ref)
      ? label.slice(ref.length).trim()
      : label.trim();
    const title =
      afterRef.replace(/^[\s\-–—]+/, "").trim() || `Document ${ref}`;
    return {
      id: dec.id,
      reference: ref,
      title,
      type: getDocumentType(ref),
      status: "Adopted",
      subjects: [],
      sourceUrl: getProcedureUrl(ref),
      votingResult: {
        favor: dec.number_of_votes_favor || 0,
        against: dec.number_of_votes_against || 0,
        abstention: dec.number_of_votes_abstention || 0,
      },
      lastActivity: dec.activity_date
        ? { date: dec.activity_date, type: "Voted" }
        : undefined,
    };
  });
}

export async function getProcedureDetails(
  procId: string
): Promise<ApiProcedureDetailed | null> {
  const cacheKey = getCacheKey("procedure-details", procId);
  const cached = apiCache.get<ApiProcedureDetailed>(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(
      `${BASE_URL}/procedures/${procId}?format=application%2Fld%2Bjson`,
      {
        headers: {
          Accept: "application/ld+json",
        },
        next: { revalidate: 3600, tags: ["europarl-procedure-details"] },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch procedure ${procId}: ${res.status}`);
      return null;
    }

    const data: ApiResponse<ApiProcedureDetailed> = await res.json();
    const procedure = data.data?.[0] || null;

    if (procedure) {
      apiCache.set(cacheKey, procedure, CACHE_TTL);
    }
    return procedure;
  } catch (error) {
    console.warn(`Error fetching procedure ${procId}:`, error);
    return null;
  }
}

export function transformMeetings(
  response: ApiResponse<ApiMeeting>,
  locale: ContentLocale = DEFAULT_LOCALE
): PlenarySession[] {
  const meetings = response.data || response["@graph"] || [];

  if (meetings.length === 0) {
    console.warn("No meetings found in API response");
    return [];
  }

  return meetings
    .filter((meeting) => {
      if (!meeting || typeof meeting !== "object") return false;
      const type = meeting.had_activity_type || "";
      return type.includes("PLENARY");
    })
    .map((meeting): PlenarySession | null => {
      // A meeting with no usable date is dropped rather than defaulted to now:
      // defaulting made undated records look like a session happening today.
      const startRaw = meeting.activity_start_date || meeting.activity_date;
      if (!startRaw) return null;

      const startDate = new Date(startRaw);
      if (Number.isNaN(startDate.getTime())) return null;

      const endRaw =
        meeting.activity_end_date || meeting.activity_date || startRaw;
      const parsedEnd = new Date(endRaw);
      const endDate = Number.isNaN(parsedEnd.getTime()) ? startDate : parsedEnd;

      return {
        id: meeting.activity_id || meeting.id,
        title: getLocalizedLabel(meeting.activity_label, locale),
        startDate,
        endDate,
        type: "Plenary Session",
      };
    })
    .filter((session): session is PlenarySession => session !== null)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

function transformProceduresLight(
  basicProcedures: ApiProcedureBasic[]
): LegislativeProcedure[] {
  return basicProcedures.map((basic) => {
    let reference = extractReferenceFromLabel(basic.label || "");
    if (!reference) {
      const procId = basic.process_id || basic.id.split("/").pop() || "";
      if (procId) {
        reference = convertProcedureIdToReference(procId) || procId;
      }
    }

    return {
      id: basic.process_id || basic.id,
      reference: reference,
      title: basic.label || "Untitled Procedure",
      type: getProcedureTypeLabel(basic.process_type),
      subjects: [],
      status: "In Progress",
      sourceUrl: reference ? getProcedureUrl(reference) : undefined,
    };
  });
}

export async function enrichProcedures(
  basicProcedures: ApiProcedureBasic[],
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<LegislativeProcedure[]> {
  const enrichedProcedures: LegislativeProcedure[] = [];

  const details = await mapWithConcurrency(
    basicProcedures,
    MAX_CONCURRENT_DETAIL_REQUESTS,
    (proc) => {
      const procId = proc.process_id || proc.id.split("/").pop() || "";
      return getProcedureDetails(procId);
    }
  );

  for (let i = 0; i < basicProcedures.length; i++) {
    const basic = basicProcedures[i];
    const detailed = details[i];

    const title = detailed?.process_title
      ? getLocalizedLabel(detailed.process_title, locale)
      : basic.label || "Untitled Procedure";

    const summary = detailed?.process_summary
      ? getLocalizedLabel(detailed.process_summary, locale)
      : undefined;

    const committees = detailed
      ? extractCommittees(detailed.had_participation)
      : [];
    const lastActivity = detailed
      ? getLatestActivity(detailed.consists_of)
      : undefined;
    const status = detailed ? getStageLabel(detailed.current_stage) : "Active";

    let reference = extractReferenceFromLabel(basic.label || "");
    if (!reference) {
      const procId = basic.process_id || basic.id.split("/").pop() || "";
      if (procId) {
        reference = convertProcedureIdToReference(procId) || procId;
      }
    }

    enrichedProcedures.push({
      id: basic.process_id || basic.id,
      reference: reference,
      title: title,
      summary: summary,
      type: getProcedureTypeLabel(basic.process_type),
      subjects: committees,
      status: status,
      sourceUrl: detailed && reference ? getProcedureUrl(reference) : undefined,
      lastActivity: lastActivity,
    });
  }

  return enrichedProcedures;
}

export interface FetchResult<T> {
  data: T;
  error: string | null;
}

export async function getUpcomingPlenarySessions(
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<FetchResult<PlenarySession[]>> {
  try {
    const response = await getMeetings();
    const sessions = transformMeetings(response, locale);
    const now = new Date();
    const upcoming = sessions.filter((session) => session.startDate >= now);
    return { data: upcoming, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch plenary sessions";
    console.error("Failed to fetch plenary sessions:", error);
    return { data: [], error: message };
  }
}

export async function getInProgressProcedures(
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<FetchResult<LegislativeProcedure[]>> {
  try {
    const proceduresResponse = await getProcedures();
    const basicProcedures =
      proceduresResponse.data || proceduresResponse["@graph"] || [];

    const firstPage = basicProcedures.slice(0, 6);
    const rest = basicProcedures.slice(6);

    const enrichedFirstPage = await enrichProcedures(firstPage, locale);
    const lightRest = transformProceduresLight(rest);

    const procedures = [...enrichedFirstPage, ...lightRest];
    return { data: procedures, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch in-progress procedures";
    console.error("Failed to fetch in-progress procedures:", error);
    return { data: [], error: message };
  }
}

export async function getCompletedProcedures(
  locale: ContentLocale = DEFAULT_LOCALE
): Promise<FetchResult<LegislativeProcedure[]>> {
  try {
    const recentDecisions = await getRecentPlenaryDecisions();
    const completed = transformDecisionsLight(recentDecisions);
    const enriched = await mapWithConcurrency(
      completed,
      MAX_CONCURRENT_DETAIL_REQUESTS,
      async (p) => {
        const fullTitle = await fetchFullTitleForReference(p.reference, locale);
        return { ...p, title: fullTitle ?? p.title };
      }
    );
    return { data: enriched, error: null };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch completed procedures";
    console.error("Failed to fetch completed procedures:", error);
    return { data: [], error: message };
  }
}

/* ------------------------------------------------------------------ *
 * Ingest
 * ------------------------------------------------------------------ */

/**
 * A procedure in the shape the local mirror stores it.
 *
 * Unlike the read path, this keeps the European Parliament's language maps
 * intact rather than collapsing them to one locale, so the stored row can
 * serve any supported language later.
 */
export interface IngestProcedure {
  reference: string;
  process_id: string | null;
  titles: Record<string, string>;
  summaries: Record<string, string>;
  type: string;
  status: string;
  committees: string[];
  source_url: string | null;
  last_activity_date: string | null;
  last_activity_type: string | null;
  is_completed: boolean;
  votes_favor: number | null;
  votes_against: number | null;
  votes_abstention: number | null;
  voted_at: string | null;
}

export interface IngestSession {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
}

/**
 * How many years back to walk when collecting procedures. The read path only
 * ever looked at the current and previous year because it ran per request;
 * the ingest job has no such constraint, so the mirror can be deeper than the
 * live view ever was.
 */
const INGEST_YEARS = 3;

/** The EP API caps a page at 200 and honours `offset`, so walk it. */
const INGEST_PAGE_SIZE = 200;

/** Backstop against an upstream that never returns a short page. */
const INGEST_MAX_PAGES_PER_YEAR = 15;

/**
 * Fetches every procedure the EP API will return for a year.
 *
 * The request-time path deliberately asks for 15, because it runs per render.
 * The ingest job has no such constraint and this is the whole reason it
 * exists, so it paginates instead.
 */
async function fetchAllProcedureBasicsForYear(
  year: number
): Promise<ApiProcedureBasic[]> {
  const collected: ApiProcedureBasic[] = [];

  for (let page = 0; page < INGEST_MAX_PAGES_PER_YEAR; page++) {
    const offset = page * INGEST_PAGE_SIZE;

    try {
      const res = await fetch(
        `${BASE_URL}/procedures?format=application%2Fld%2Bjson&offset=${offset}&limit=${INGEST_PAGE_SIZE}&year=${year}`,
        {
          headers: { Accept: "application/ld+json" },
          cache: "no-store",
          signal: AbortSignal.timeout(30000),
        }
      );

      if (!res.ok) break;

      const data: ApiResponse<ApiProcedureBasic> = await res.json();
      const items = data.data || data["@graph"] || [];

      collected.push(...items);

      // A short page means we have reached the end of the year.
      if (items.length < INGEST_PAGE_SIZE) break;
    } catch (error) {
      console.warn(`Procedure page ${offset} for ${year} failed:`, error);
      break;
    }
  }

  return collected;
}

function resolveReference(basic: ApiProcedureBasic): string {
  const fromLabel = extractReferenceFromLabel(basic.label || "");
  if (fromLabel) return fromLabel;

  const procId = basic.process_id || basic.id.split("/").pop() || "";
  if (!procId) return "";

  return convertProcedureIdToReference(procId) || procId;
}

/**
 * Collects every procedure the EP API will give us for the recent years,
 * enriched with its detail record.
 *
 * Intended for the scheduled ingest job only — it makes far more upstream
 * requests than any request-time path should.
 */
export async function collectProcedureBasicsForIngest(): Promise<
  IngestProcedure[]
> {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: INGEST_YEARS }, (_, i) => currentYear - i);

  const perYear = await mapWithConcurrency(years, 2, (year) =>
    fetchAllProcedureBasicsForYear(year)
  );

  // The same procedure can appear under more than one year bucket.
  const unique = new Map<string, ApiProcedureBasic>();
  for (const basic of perYear.flat()) {
    const reference = resolveReference(basic);
    if (reference && !unique.has(reference)) unique.set(reference, basic);
  }

  return [...unique.entries()].map(([reference, basic]) => ({
    reference,
    process_id: basic.process_id ?? null,
    titles: { en: basic.label ?? reference },
    summaries: {},
    type: getProcedureTypeLabel(basic.process_type),
    status: "In Progress",
    committees: [],
    source_url: getProcedureUrl(reference),
    last_activity_date: null,
    last_activity_type: null,
    is_completed: false,
    votes_favor: null,
    votes_against: null,
    votes_abstention: null,
    voted_at: null,
  }));
}

export interface ProcedureEnrichment {
  titles: Record<string, string>;
  summaries: Record<string, string>;
  status: string;
  committees: string[];
  last_activity_date: string | null;
  last_activity_type: string | null;
}

/**
 * Fetches the detail record for one procedure.
 *
 * Kept separate from the basic listing so the job can enrich a bounded batch
 * per run: one detail request per procedure over thousands of rows would not
 * fit in a serverless invocation.
 */
export async function fetchProcedureEnrichment(
  reference: string,
  processId: string | null
): Promise<ProcedureEnrichment | null> {
  const procId =
    processId || reference.replace(/\//g, "_").replace(/[()]/g, "");

  const detailed = await getProcedureDetails(procId);
  if (!detailed) return null;

  const lastActivity = getLatestActivity(detailed.consists_of);

  return {
    titles: detailed.process_title ?? {},
    summaries: detailed.process_summary ?? {},
    status: getStageLabel(detailed.current_stage),
    committees: extractCommittees(detailed.had_participation),
    last_activity_date: lastActivity?.date ?? null,
    last_activity_type: lastActivity?.type ?? null,
  };
}

/**
 * Collects recently adopted texts, including their vote counts.
 *
 * This is the path that used to pull multi-megabyte responses on every render.
 * Running it in the job means the cost is paid once per day rather than once
 * per cache miss.
 */
export async function collectVotedProceduresForIngest(): Promise<
  IngestProcedure[]
> {
  const decisions = await loadRecentPlenaryDecisions();
  const voted = transformDecisionsLight(decisions);

  const titles = await mapWithConcurrency(
    voted,
    MAX_CONCURRENT_DETAIL_REQUESTS,
    (procedure) => fetchFullTitleForReference(procedure.reference)
  );

  return voted.map((procedure, index) => ({
    reference: procedure.reference,
    process_id: null,
    titles: { en: titles[index] ?? procedure.title },
    summaries: {},
    type: procedure.type,
    status: "Adopted",
    committees: [],
    source_url: procedure.sourceUrl ?? null,
    last_activity_date: procedure.lastActivity?.date ?? null,
    last_activity_type: procedure.lastActivity?.type ?? null,
    is_completed: true,
    votes_favor: procedure.votingResult?.favor ?? null,
    votes_against: procedure.votingResult?.against ?? null,
    votes_abstention: procedure.votingResult?.abstention ?? null,
    voted_at: procedure.lastActivity?.date ?? null,
  }));
}

export async function collectSessionsForIngest(): Promise<IngestSession[]> {
  // Non-fatal: the meetings endpoint failing (a 429, say) should not discard
  // the procedure work that ran alongside it.
  let response: ApiResponse<ApiMeeting>;
  try {
    response = await getMeetings();
  } catch (error) {
    console.warn("Session collection failed, continuing without it:", error);
    return [];
  }

  const sessions = transformMeetings(response);

  return sessions.map((session) => ({
    id: session.id,
    title: session.title,
    start_date: session.startDate.toISOString(),
    end_date: session.endDate.toISOString(),
  }));
}
