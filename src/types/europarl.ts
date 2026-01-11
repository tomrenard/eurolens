export interface EuroparlApiResponse<T> {
  "@context": string;
  "@graph": T[];
  "@id": string;
  "@type": string;
}

export interface Meeting {
  "@id": string;
  "@type": string;
  identifier: string;
  title?: LocalizedText | LocalizedText[];
  date?: string;
  startDate?: string;
  endDate?: string;
  activity_type?: string;
  had_activity_type?: {
    "@id": string;
    prefLabel?: LocalizedText;
  };
}

export interface LocalizedText {
  "@language": string;
  "@value": string;
}

export interface Procedure {
  "@id": string;
  "@type": string;
  identifier: string;
  reference?: string;
  title?: LocalizedText | LocalizedText[];
  prefLabel?: LocalizedText | LocalizedText[];
  subject_matter?: SubjectMatter | SubjectMatter[];
  had_procedure_type?: {
    "@id": string;
    prefLabel?: LocalizedText;
  };
  europarlId?: string;
  was_generated_by?: Activity | Activity[];
  status?: {
    "@id": string;
    prefLabel?: LocalizedText;
  };
}

export interface SubjectMatter {
  "@id": string;
  prefLabel?: LocalizedText | LocalizedText[];
}

export interface Activity {
  "@id": string;
  "@type": string;
  date?: string;
  title?: LocalizedText | LocalizedText[];
  had_activity_type?: {
    "@id": string;
    prefLabel?: LocalizedText;
  };
}

export interface PlenarySession {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  type: string;
}

export interface LegislativeProcedure {
  id: string;
  reference: string;
  title: string;
  type: string;
  subjects: string[];
  status: string;
  lastActivity?: {
    date: string;
    type: string;
  };
}

export type Persona =
  | "student"
  | "small-business-owner"
  | "farmer"
  | "worker"
  | "parent"
  | "general";

export type Country = "DE" | "FR" | "ES" | "IT" | "PL" | "NL" | "general";

export interface CitizenContext {
  persona: Persona;
  country: Country;
}

export const PERSONA_LABELS: Record<Persona, string> = {
  general: "General Citizen",
  student: "Student",
  "small-business-owner": "Small Business Owner",
  farmer: "Farmer",
  worker: "Worker",
  parent: "Parent",
};

export const COUNTRY_LABELS: Record<Country, string> = {
  general: "All EU Countries",
  DE: "Germany",
  FR: "France",
  ES: "Spain",
  IT: "Italy",
  PL: "Poland",
  NL: "Netherlands",
};
