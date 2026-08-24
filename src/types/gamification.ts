/**
 * Your civic record.
 *
 * This was previously an XP/level/achievement system with a public
 * leaderboard. Ranking citizens against each other by political activity
 * reads as partisan however carefully it is worded, and it competed for
 * attention with the information the site exists to deliver. What remains is
 * a private record of what you did: positions taken, actions logged.
 */

export type Position = "support" | "oppose" | "neutral";
export type ActionType = "contact_mep" | "consultation" | "petition" | "share";

export const ACTION_LABELS: Record<ActionType, string> = {
  contact_mep: "Contacted an MEP",
  consultation: "Joined a consultation",
  petition: "Signed a petition",
  share: "Shared",
};

export const POSITION_LABELS: Record<Position, string> = {
  support: "Support",
  oppose: "Oppose",
  neutral: "Undecided",
};

export interface UserPosition {
  id: string;
  procedureId: string;
  procedureTitle: string;
  position: Position;
  reason?: string;
  timestamp: string;
  actionsTaken: ActionType[];
}

export interface UserStats {
  totalPositions: number;
  mepsContacted: number;
  consultationsJoined: number;
  petitionsSigned: number;
  proceduresShared: number;
}

export interface UserProfile {
  id: string;
  username: string;
  stats: UserStats;
  createdAt: string;
}

export const EMPTY_STATS: UserStats = {
  totalPositions: 0,
  mepsContacted: 0,
  consultationsJoined: 0,
  petitionsSigned: 0,
  proceduresShared: 0,
};
