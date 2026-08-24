import type { ActionType, UserStats } from "@/types/gamification";
import { EMPTY_STATS } from "@/types/gamification";

/**
 * Derives a user's civic record from the rows the server holds.
 *
 * Counts are computed here rather than accepted from the client. That was
 * originally a security fix — the client used to compute its own score and
 * post it — and it remains the right shape now that the score is just a
 * tally: what the record says is exactly what was recorded.
 */

export interface PositionRow {
  procedure_id: string;
  actions_taken: unknown;
}

export const ACTION_TYPES: ActionType[] = [
  "contact_mep",
  "consultation",
  "petition",
  "share",
];

export function isActionType(value: unknown): value is ActionType {
  return (
    typeof value === "string" && ACTION_TYPES.includes(value as ActionType)
  );
}

/** Reads the `actions_taken` JSON column defensively, discarding duplicates. */
export function parseActions(value: unknown): ActionType[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<ActionType>();
  for (const entry of value) {
    if (isActionType(entry)) seen.add(entry);
  }
  return [...seen];
}

export function deriveStats(positions: PositionRow[]): UserStats {
  const stats: UserStats = {
    ...EMPTY_STATS,
    totalPositions: positions.length,
  };

  for (const position of positions) {
    for (const action of parseActions(position.actions_taken)) {
      switch (action) {
        case "contact_mep":
          stats.mepsContacted++;
          break;
        case "consultation":
          stats.consultationsJoined++;
          break;
        case "petition":
          stats.petitionsSigned++;
          break;
        case "share":
          stats.proceduresShared++;
          break;
      }
    }
  }

  return stats;
}

export function totalActions(stats: UserStats): number {
  return (
    stats.mepsContacted +
    stats.consultationsJoined +
    stats.petitionsSigned +
    stats.proceduresShared
  );
}
