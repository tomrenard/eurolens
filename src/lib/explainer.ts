/**
 * Deterministic, offline explainer for EU legislative jargon.
 *
 * This replaces the previous LLM-generated summaries. Every string here is
 * derived from a fixed glossary or computed from structured fields, so the
 * output is reproducible, instant, free, and — unlike a generated summary —
 * cannot assert anything that is not in the data.
 */

import type {
  LegislativeProcedure,
  Persona,
  VotingResult,
} from "@/types/europarl";

export interface Explanation {
  /** One sentence: what kind of instrument this is and who decides. */
  what: string;
  /** Where the file currently stands. */
  stage: string;
  /** What concretely happens next, when it can be derived. */
  next?: string;
  /** Plain reading of the vote result, when a vote has taken place. */
  outcome?: string;
  /** Expanded committee names, e.g. "ENVI — Environment, Climate and Food Safety". */
  committees: string[];
  /** Why this may matter to the selected persona, when a mapping exists. */
  relevance?: string;
}

/* ------------------------------------------------------------------ *
 * Procedure types
 * ------------------------------------------------------------------ */

interface ProcedureTypeInfo {
  /** Human name as shown on badges. */
  label: string;
  /** One sentence explaining who has to agree for this to take effect. */
  meaning: string;
}

/**
 * Keyed by the three-letter code found in a procedure reference such as
 * `2024/0123(COD)`, and by the labels produced by `getProcedureTypeLabel`.
 */
export const PROCEDURE_TYPES: Record<string, ProcedureTypeInfo> = {
  COD: {
    label: "Ordinary legislative procedure",
    meaning:
      "Parliament and the Council of the EU are equal co-legislators: both must agree on the same text before it can become law.",
  },
  CNS: {
    label: "Consultation",
    meaning:
      "The Council decides. Parliament is asked for an opinion, but the Council is not obliged to follow it.",
  },
  APP: {
    label: "Consent",
    meaning:
      "Parliament cannot amend the text, but nothing can take effect without Parliament's approval — an all-or-nothing vote.",
  },
  NLE: {
    label: "Non-legislative procedure",
    meaning:
      "Usually an international agreement or an appointment, rather than a new EU law.",
  },
  BUD: {
    label: "Budgetary procedure",
    meaning:
      "Parliament and the Council together decide how the EU spends its money for the year.",
  },
  DEC: {
    label: "Discharge",
    meaning:
      "Parliament signs off — or refuses to sign off — on how an EU institution spent its budget.",
  },
  INI: {
    label: "Own-initiative report",
    meaning:
      "Parliament setting out its own position to push the Commission to act. It creates political pressure, not law.",
  },
  INL: {
    label: "Legislative initiative",
    meaning:
      "Parliament formally asking the Commission to propose a law. The Commission must respond, but is not obliged to comply.",
  },
  RSP: {
    label: "Resolution",
    meaning:
      "A political statement of Parliament's position. It carries no legal force on its own.",
  },
  IMM: {
    label: "Immunity procedure",
    meaning:
      "Parliament deciding whether to lift or defend the legal immunity of one of its members.",
  },
  REG: {
    label: "Rules of Procedure",
    meaning: "Parliament changing its own internal rules.",
  },
  SYN: {
    label: "Cooperation procedure",
    meaning:
      "A historical procedure, largely replaced by the ordinary legislative procedure.",
  },
};

/** Maps the display labels used elsewhere in the app back onto the codes above. */
const LABEL_TO_CODE: Record<string, string> = {
  Codecision: "COD",
  Consultation: "CNS",
  Consent: "APP",
  "Non-legislative": "NLE",
  Budget: "BUD",
  Discharge: "DEC",
  "Own-initiative": "INI",
  "Legislative Initiative": "INL",
  Resolution: "RSP",
  Immunity: "IMM",
  "Rules of Procedure": "REG",
  Cooperation: "SYN",
};

/** Document-reference prefixes (A9-0123/2024 and friends). */
const DOCUMENT_PREFIXES: Record<string, string> = {
  A: "a committee report — the position a parliamentary committee recommends to the full house",
  B: "a motion for a resolution — a text tabled for the full house to vote on",
  C: "a document forwarded to Parliament by another EU institution",
};

export function getProcedureCode(procedure: {
  reference?: string;
  type?: string;
}): string | null {
  const fromReference = procedure.reference?.match(/\(([A-Z]{3})\)/)?.[1];
  if (fromReference && PROCEDURE_TYPES[fromReference]) return fromReference;

  const fromType = procedure.type ? LABEL_TO_CODE[procedure.type] : undefined;
  if (fromType) return fromType;

  return null;
}

/* ------------------------------------------------------------------ *
 * Committees
 * ------------------------------------------------------------------ */

export const COMMITTEES: Record<string, string> = {
  AFET: "Foreign Affairs",
  DEVE: "Development",
  INTA: "International Trade",
  BUDG: "Budgets",
  CONT: "Budgetary Control",
  ECON: "Economic and Monetary Affairs",
  EMPL: "Employment and Social Affairs",
  ENVI: "Environment, Climate and Food Safety",
  ITRE: "Industry, Research and Energy",
  IMCO: "Internal Market and Consumer Protection",
  TRAN: "Transport and Tourism",
  REGI: "Regional Development",
  AGRI: "Agriculture and Rural Development",
  PECH: "Fisheries",
  CULT: "Culture and Education",
  JURI: "Legal Affairs",
  LIBE: "Civil Liberties, Justice and Home Affairs",
  AFCO: "Constitutional Affairs",
  FEMM: "Women's Rights and Gender Equality",
  PETI: "Petitions",
  DROI: "Human Rights",
  SEDE: "Security and Defence",
  SANT: "Public Health",
  EUDS: "European Democracy Shield",
  HOUS: "Housing Crisis",
};

export function expandCommittee(code: string): string {
  const key = code.toUpperCase().trim();
  const name = COMMITTEES[key];
  return name ? `${key} — ${name}` : key;
}

/* ------------------------------------------------------------------ *
 * Stages
 * ------------------------------------------------------------------ */

interface StageInfo {
  description: string;
  next?: string;
}

/**
 * Reading stages describe the ordinary legislative procedure. Applying them to
 * a discharge, resolution or own-initiative file produces confident nonsense
 * ("committees are amending the Commission's proposal" for a budget sign-off),
 * so non-legislative types get a neutral description instead.
 */
const NON_LEGISLATIVE_STAGES: Record<string, StageInfo> = {
  Completed: { description: "The procedure is closed." },
  Adopted: { description: "Parliament has adopted this text." },
};

const NON_LEGISLATIVE_DEFAULT: StageInfo = {
  description: "Before Parliament, not yet concluded.",
};

const STAGES: Record<string, StageInfo> = {
  "1st Reading": {
    description:
      "Parliament is forming its position for the first time. Committees are amending the Commission's proposal.",
    next: "Once Parliament votes its position, the Council of the EU responds with its own. If they already agree, the file can be settled here.",
  },
  "2nd Reading": {
    description:
      "Parliament and the Council did not agree the first time. Parliament is now examining the Council's position.",
    next: "Parliament has three months to accept, amend or reject the Council's position. Rejection stops the file entirely.",
  },
  "3rd Reading": {
    description:
      "Negotiators from Parliament and the Council have agreed a joint text after formal conciliation.",
    next: "Both institutions vote on the joint text without further amendment. Either can still bring it down.",
  },
  Conciliation: {
    description:
      "Parliament and the Council still disagree, so a joint committee is negotiating a compromise.",
    next: "If conciliation produces a joint text, both institutions vote on it. If not, the file falls.",
  },
  Completed: {
    description: "The procedure is closed. Parliament has finished with it.",
  },
  Adopted: {
    description: "Parliament has adopted this text.",
  },
  "In Progress": {
    description: "The file is moving through Parliament.",
  },
  Active: {
    description: "The file is open and has not yet reached a final vote.",
  },
};

/* ------------------------------------------------------------------ *
 * Vote outcome
 * ------------------------------------------------------------------ */

/** Total seats in the European Parliament for the current (10th) term. */
const TOTAL_SEATS = 720;

export interface VoteReading {
  sentence: string;
  /** True when the sides were within 10% of each other, abstentions excluded. */
  wasClose: boolean;
  marginPercent: number;
  turnout: number;
}

export function readVote(result: VotingResult): VoteReading | null {
  const { favor, against, abstention } = result;
  const cast = favor + against + abstention;
  if (cast === 0) return null;

  const decisive = favor + against;
  const margin = Math.abs(favor - against);
  const marginPercent = decisive > 0 ? (margin / decisive) * 100 : 0;
  const wasClose = decisive > 0 && marginPercent < 10;
  const passed = favor > against;

  const tied = favor === against;

  const parts: string[] = [];
  parts.push(
    tied
      ? `Tied, ${favor} votes each`
      : passed
        ? `Carried by ${favor} votes to ${against}`
        : `Rejected by ${against} votes to ${favor}`
  );
  if (abstention > 0) parts.push(`with ${abstention} abstentions`);

  let sentence = parts.join(", ") + ".";

  if (wasClose && !tied) {
    sentence += ` That is a margin of ${margin} vote${
      margin === 1 ? "" : "s"
    } — a close result.`;
  }

  const turnout = Math.round((cast / TOTAL_SEATS) * 100);
  if (turnout < 75) {
    sentence += ` ${cast} of ${TOTAL_SEATS} members took part (${turnout}%).`;
  }

  return { sentence, wasClose, marginPercent, turnout };
}

/* ------------------------------------------------------------------ *
 * Persona relevance
 * ------------------------------------------------------------------ */

/**
 * Committee codes and topic keywords that tend to matter to each persona.
 * Used both to explain relevance and to rank the feed, replacing the previous
 * "tell the model who the reader is" approach.
 */
const PERSONA_SIGNALS: Record<
  Exclude<Persona, "general">,
  { committees: string[]; keywords: string[]; concern: string }
> = {
  student: {
    committees: ["CULT", "EMPL", "ITRE"],
    keywords: [
      "education",
      "university",
      "student",
      "training",
      "youth",
      "erasmus",
      "research",
      "digital",
    ],
    concern: "education, training and youth opportunities",
  },
  "small-business-owner": {
    committees: ["IMCO", "ECON", "ITRE", "INTA", "JURI"],
    keywords: [
      "business",
      "smes",
      "small and medium",
      "market",
      "competition",
      "tax",
      "trade",
      "company",
      "administrative burden",
      "reporting",
    ],
    concern: "compliance costs, market access and taxation",
  },
  farmer: {
    committees: ["AGRI", "ENVI", "PECH"],
    keywords: [
      "agricultur",
      "farm",
      "rural",
      "food",
      "pesticide",
      "livestock",
      "fisher",
      "soil",
      "water",
      "subsid",
    ],
    concern: "farming rules, subsidies and land use",
  },
  worker: {
    committees: ["EMPL", "ECON", "TRAN"],
    keywords: [
      "worker",
      "employment",
      "labour",
      "labor",
      "wage",
      "working condition",
      "social security",
      "pension",
      "health and safety",
      "platform work",
    ],
    concern: "pay, working conditions and job security",
  },
  parent: {
    committees: ["LIBE", "ENVI", "CULT", "FEMM", "IMCO"],
    keywords: [
      "child",
      "family",
      "school",
      "health",
      "consumer",
      "safety",
      "toy",
      "online protection",
      "parental",
      "care",
    ],
    concern: "family life, child safety and consumer protection",
  },
};

interface RelevanceInput {
  committees?: string[];
  topics?: string[];
  title?: string;
}

/**
 * Scores how strongly a file matches a persona's interests.
 * 0 means no signal; higher is a stronger match.
 */
export function scoreRelevance(
  input: RelevanceInput,
  persona: Persona
): number {
  if (persona === "general") return 0;
  const signals = PERSONA_SIGNALS[persona];
  if (!signals) return 0;

  let score = 0;

  for (const committee of input.committees ?? []) {
    if (signals.committees.includes(committee.toUpperCase().trim())) score += 3;
  }

  const haystack = [...(input.topics ?? []), input.title ?? ""]
    .join(" ")
    .toLowerCase();

  for (const keyword of signals.keywords) {
    if (haystack.includes(keyword)) score += 1;
  }

  return score;
}

export function describeRelevance(
  input: RelevanceInput,
  persona: Persona
): string | undefined {
  if (persona === "general") return undefined;
  const signals = PERSONA_SIGNALS[persona];
  if (!signals) return undefined;

  const score = scoreRelevance(input, persona);
  if (score === 0) return undefined;

  const matchedCommittees = (input.committees ?? []).filter((c) =>
    signals.committees.includes(c.toUpperCase().trim())
  );

  if (matchedCommittees.length > 0) {
    const names = matchedCommittees
      .map((c) => COMMITTEES[c.toUpperCase().trim()] ?? c)
      .join(" and ");
    return `Handled by the ${names} committee, which covers ${signals.concern}.`;
  }

  return `This file touches ${signals.concern}.`;
}

/* ------------------------------------------------------------------ *
 * Assembly
 * ------------------------------------------------------------------ */

function describeInstrument(procedure: LegislativeProcedure): string {
  const code = getProcedureCode(procedure);
  if (code) {
    const info = PROCEDURE_TYPES[code];
    return `${info.label}. ${info.meaning}`;
  }

  const prefix = procedure.reference?.[0];
  if (prefix && DOCUMENT_PREFIXES[prefix]) {
    return `This is ${DOCUMENT_PREFIXES[prefix]}.`;
  }

  return "A file before the European Parliament.";
}

/**
 * Procedure codes that move through readings between Parliament and the
 * Council. Everything else is a single-track file.
 */
const READING_BASED_CODES = new Set(["COD", "CNS", "APP", "BUD", "SYN"]);

function describeStage(
  procedure: LegislativeProcedure,
  code: string | null
): StageInfo | undefined {
  if (code && !READING_BASED_CODES.has(code)) {
    return (
      NON_LEGISLATIVE_STAGES[procedure.status] ?? NON_LEGISLATIVE_DEFAULT
    );
  }
  return STAGES[procedure.status];
}

export function explain(
  procedure: LegislativeProcedure,
  persona: Persona = "general"
): Explanation {
  const code = getProcedureCode(procedure);
  const stageInfo = describeStage(procedure, code);
  const vote = procedure.votingResult ? readVote(procedure.votingResult) : null;

  return {
    what: describeInstrument(procedure),
    stage: stageInfo?.description ?? `Current stage: ${procedure.status}.`,
    next: vote ? undefined : stageInfo?.next,
    outcome: vote?.sentence,
    committees: procedure.subjects.map(expandCommittee),
    relevance: describeRelevance(
      { committees: procedure.subjects, title: procedure.title },
      persona
    ),
  };
}
