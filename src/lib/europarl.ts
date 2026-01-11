import type {
  PlenarySession,
  LegislativeProcedure,
} from "@/types/europarl";

const BASE_URL = "https://data.europarl.europa.eu/api/v2";

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

function getLocalizedLabel(
  labels: Record<string, string> | undefined,
  lang: string = "en"
): string {
  if (!labels) return "";
  return labels[lang] || labels.en || Object.values(labels)[0] || "";
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
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG1": "1st Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG2": "2nd Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/RDG3": "3rd Reading",
    "http://publications.europa.eu/resource/authority/procedure-phase/CONC": "Conciliation",
    "http://publications.europa.eu/resource/authority/procedure-phase/FIN": "Completed",
  };
  
  return stageMap[stage] || "In Progress";
}

function extractCommittees(participation: ApiProcedureDetailed["had_participation"]): string[] {
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

function getLatestActivity(consists_of: ApiProcedureDetailed["consists_of"]): { date: string; type: string } | undefined {
  if (!consists_of || !Array.isArray(consists_of) || consists_of.length === 0) return undefined;
  
  const validActivities = consists_of.filter(a => a && a.activity_date);
  if (validActivities.length === 0) return undefined;
  
  const sorted = validActivities.sort((a, b) => 
    new Date(b.activity_date!).getTime() - new Date(a.activity_date!).getTime()
  );
  
  const latest = sorted[0];
  const activityType = latest.had_activity_type?.split("/").pop()?.replace(/_/g, " ") || "Activity";
  
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
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch meetings: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getProcedures(): Promise<ApiResponse<ApiProcedureBasic>> {
  const currentYear = new Date().getFullYear();
  const res = await fetch(
    `${BASE_URL}/procedures?format=application%2Fld%2Bjson&offset=0&limit=10&year=${currentYear}`,
    {
      headers: {
        Accept: "application/ld+json",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch procedures: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

export async function getProcedureDetails(procId: string): Promise<ApiProcedureDetailed | null> {
  try {
    const res = await fetch(
      `${BASE_URL}/procedures/${procId}?format=application%2Fld%2Bjson`,
      {
        headers: {
          Accept: "application/ld+json",
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      console.warn(`Failed to fetch procedure ${procId}: ${res.status}`);
      return null;
    }

    const data: ApiResponse<ApiProcedureDetailed> = await res.json();
    return data.data?.[0] || null;
  } catch (error) {
    console.warn(`Error fetching procedure ${procId}:`, error);
    return null;
  }
}

export function transformMeetings(response: ApiResponse<ApiMeeting>): PlenarySession[] {
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
    .map((meeting) => ({
      id: meeting.activity_id || meeting.id,
      title: getLocalizedLabel(meeting.activity_label),
      startDate: new Date(meeting.activity_start_date || meeting.activity_date || Date.now()),
      endDate: new Date(meeting.activity_end_date || meeting.activity_date || Date.now()),
      type: "Plenary Session",
    }))
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
}

export async function enrichProcedures(basicProcedures: ApiProcedureBasic[]): Promise<LegislativeProcedure[]> {
  const enrichedProcedures: LegislativeProcedure[] = [];
  
  const detailsPromises = basicProcedures.map(proc => {
    const procId = proc.process_id || proc.id.split("/").pop() || "";
    return getProcedureDetails(procId);
  });
  
  const details = await Promise.all(detailsPromises);
  
  for (let i = 0; i < basicProcedures.length; i++) {
    const basic = basicProcedures[i];
    const detailed = details[i];
    
    const title = detailed?.process_title 
      ? getLocalizedLabel(detailed.process_title)
      : basic.label || "Untitled Procedure";
    
    const committees = detailed ? extractCommittees(detailed.had_participation) : [];
    const lastActivity = detailed ? getLatestActivity(detailed.consists_of) : undefined;
    const status = detailed ? getStageLabel(detailed.current_stage) : "Active";
    
    enrichedProcedures.push({
      id: basic.process_id || basic.id,
      reference: basic.label || basic.process_id || "",
      title: title,
      type: getProcedureTypeLabel(basic.process_type),
      subjects: committees,
      status: status,
      lastActivity: lastActivity,
    });
  }
  
  return enrichedProcedures;
}

export interface FetchResult<T> {
  data: T;
  error: string | null;
}

export async function getUpcomingPlenarySessions(): Promise<FetchResult<PlenarySession[]>> {
  try {
    const response = await getMeetings();
    const sessions = transformMeetings(response);
    const now = new Date();
    const upcoming = sessions.filter((session) => session.startDate >= now);
    return { data: upcoming, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch plenary sessions";
    console.error("Failed to fetch plenary sessions:", error);
    return { data: [], error: message };
  }
}

export async function getLegislativeProcedures(): Promise<FetchResult<LegislativeProcedure[]>> {
  try {
    const response = await getProcedures();
    const basicProcedures = response.data || response["@graph"] || [];
    
    if (basicProcedures.length === 0) {
      return { data: [], error: null };
    }
    
    const procedures = await enrichProcedures(basicProcedures);
    return { data: procedures, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch legislative procedures";
    console.error("Failed to fetch legislative procedures:", error);
    return { data: [], error: message };
  }
}
