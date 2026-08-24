import type { ActionType, UserStats } from "@/types/gamification";
import { XP_REWARDS, ACHIEVEMENTS_LIST } from "@/types/gamification";
import { getLevel } from "@/lib/gamification";

/**
 * Server-side scoring.
 *
 * XP, stats and achievements are derived here from rows the server holds, so
 * a profile is a pure function of recorded positions and actions. Previously
 * the client computed them in localStorage and posted the result, which meant
 * anyone could edit their own score and top the public leaderboard.
 */

export interface PositionRow {
  procedure_id: string;
  actions_taken: unknown;
}

const ACTION_XP: Record<ActionType, number> = {
  contact_mep: XP_REWARDS.CONTACT_MEP,
  consultation: XP_REWARDS.JOIN_CONSULTATION,
  petition: XP_REWARDS.SIGN_PETITION,
  share: XP_REWARDS.SHARE_PROCEDURE,
};

export const ACTION_TYPES = Object.keys(ACTION_XP) as ActionType[];

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

export interface DerivedProfile {
  xp: number;
  level: number;
  stats: UserStats;
  achievements: string[];
}

interface AchievementContext {
  stats: UserStats;
  /** Level before achievement bonuses, so the rules stay non-recursive. */
  baseLevel: number;
  streak: number;
  distinctActionTypes: number;
  totalActions: number;
}

/**
 * Thresholds keyed by the ids in ACHIEVEMENTS_LIST. An id with no rule here is
 * never granted, so adding an achievement without a rule leaves it locked
 * rather than awarding it to everybody.
 */
const ACHIEVEMENT_RULES: Record<string, (ctx: AchievementContext) => boolean> = {
  "first-steps": (c) => c.stats.proceduresViewed >= 1,
  "curious-mind": (c) => c.stats.proceduresViewed >= 1,
  "first-voice": (c) => c.stats.totalPositions >= 1,
  "civic-champion": (c) => c.stats.mepsContacted >= 1,
  "active-citizen": (c) => c.distinctActionTypes >= 3,
  "democracy-defender": (c) => c.stats.mepsContacted >= 5,
  "consultation-expert": (c) => c.stats.consultationsJoined >= 5,
  amplifier: (c) => c.stats.proceduresShared >= 10,
  "eu-advocate": (c) => c.totalActions >= 50,
  "political-scientist": (c) => c.stats.proceduresViewed >= 10,
  "eu-expert": (c) => c.baseLevel >= 10,
  "streak-master": (c) => c.streak >= 7,
};

export interface DeriveOptions {
  /**
   * Values that cannot be verified from stored rows. They are carried over
   * from the existing profile rather than trusted from a request body, and
   * award no XP of their own.
   */
  proceduresViewed?: number;
  streak?: number;
}

export function deriveProfile(
  positions: PositionRow[],
  options: DeriveOptions = {}
): DerivedProfile {
  const stats: UserStats = {
    totalPositions: positions.length,
    mepsContacted: 0,
    consultationsJoined: 0,
    petitionsSigned: 0,
    proceduresShared: 0,
    proceduresViewed: Math.max(0, options.proceduresViewed ?? 0),
  };

  let xp = positions.length * XP_REWARDS.STATE_POSITION;
  const distinctActionTypes = new Set<ActionType>();
  let totalActions = 0;

  for (const position of positions) {
    for (const action of parseActions(position.actions_taken)) {
      xp += ACTION_XP[action];
      distinctActionTypes.add(action);
      totalActions++;

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

  const context: AchievementContext = {
    stats,
    baseLevel: getLevel(xp),
    streak: Math.max(0, options.streak ?? 0),
    distinctActionTypes: distinctActionTypes.size,
    totalActions,
  };

  const unlocked = ACHIEVEMENTS_LIST.filter(
    (achievement) => ACHIEVEMENT_RULES[achievement.id]?.(context) ?? false
  );

  for (const achievement of unlocked) {
    xp += achievement.xpReward;
  }

  return {
    xp,
    level: getLevel(xp),
    stats,
    achievements: unlocked.map((achievement) => achievement.id),
  };
}
