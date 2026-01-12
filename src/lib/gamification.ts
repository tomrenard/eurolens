import type {
  UserProfile,
  UserPosition,
  Achievement,
  Position,
  ActionType,
} from "@/types/gamification";
import {
  LEVEL_THRESHOLDS,
  LEVEL_TITLES,
  XP_REWARDS,
  ACHIEVEMENTS_LIST,
} from "@/types/gamification";

const STORAGE_KEY = "eurolens-user-profile";
const POSITIONS_KEY = "eurolens-positions";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function getLevel(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXpForNextLevel(level: number): number {
  if (level >= LEVEL_THRESHOLDS.length) return LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  return LEVEL_THRESHOLDS[level];
}

export function getXpProgress(xp: number): { current: number; next: number; progress: number } {
  const level = getLevel(xp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const xpInLevel = xp - currentThreshold;
  const xpNeeded = nextThreshold - currentThreshold;
  
  return {
    current: xpInLevel,
    next: xpNeeded,
    progress: xpNeeded > 0 ? (xpInLevel / xpNeeded) * 100 : 100,
  };
}

export function getLevelTitle(level: number): string {
  return LEVEL_TITLES[level] || LEVEL_TITLES[15];
}

function createDefaultProfile(): UserProfile {
  return {
    id: generateId(),
    username: "EU Citizen",
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: new Date().toISOString().split("T")[0],
    achievements: [],
    stats: {
      totalPositions: 0,
      mepsContacted: 0,
      consultationsJoined: 0,
      petitionsSigned: 0,
      proceduresShared: 0,
      proceduresViewed: 0,
      summariesGenerated: 0,
    },
    createdAt: new Date().toISOString(),
  };
}

function migrateProfile(profile: UserProfile): UserProfile {
  const stats = profile.stats as unknown as Record<string, number | undefined>;
  const needsMigration = 
    stats.totalPositions === undefined ||
    stats.mepsContacted === undefined;
  
  if (needsMigration) {
    return {
      ...profile,
      stats: {
        totalPositions: stats.totalPositions ?? 0,
        mepsContacted: stats.mepsContacted ?? 0,
        consultationsJoined: stats.consultationsJoined ?? 0,
        petitionsSigned: stats.petitionsSigned ?? 0,
        proceduresShared: stats.proceduresShared ?? 0,
        proceduresViewed: stats.proceduresViewed ?? 0,
        summariesGenerated: stats.summariesGenerated ?? 0,
      },
    };
  }
  return profile;
}

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return createDefaultProfile();
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const profile = JSON.parse(stored) as UserProfile;
      const migrated = migrateProfile(profile);
      if (migrated !== profile) {
        saveUserProfile(migrated);
      }
      return updateStreak(migrated);
    }
  } catch {
    // Storage not available
  }
  
  const newProfile = createDefaultProfile();
  saveUserProfile(newProfile);
  return newProfile;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage not available
  }
}

function updateStreak(profile: UserProfile): UserProfile {
  const today = new Date().toISOString().split("T")[0];
  const lastActive = profile.lastActiveDate;
  
  if (lastActive === today) {
    return profile;
  }
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];
  
  let newStreak = profile.streak;
  if (lastActive === yesterdayStr) {
    newStreak += 1;
  } else if (lastActive !== today) {
    newStreak = 1;
  }
  
  const updatedProfile = {
    ...profile,
    streak: newStreak,
    lastActiveDate: today,
  };
  
  saveUserProfile(updatedProfile);
  return updatedProfile;
}

export function addXp(amount: number): { profile: UserProfile; leveledUp: boolean; newLevel?: number } {
  const profile = getUserProfile();
  const oldLevel = profile.level;
  
  profile.xp += amount;
  profile.level = getLevel(profile.xp);
  
  const leveledUp = profile.level > oldLevel;
  
  saveUserProfile(profile);
  
  return {
    profile,
    leveledUp,
    newLevel: leveledUp ? profile.level : undefined,
  };
}

export function recordProcedureView(): { profile: UserProfile; xpGained: number } {
  const profile = getUserProfile();
  profile.stats.proceduresViewed += 1;
  profile.xp += XP_REWARDS.VIEW_PROCEDURE;
  profile.level = getLevel(profile.xp);
  saveUserProfile(profile);
  
  return { profile, xpGained: XP_REWARDS.VIEW_PROCEDURE };
}

export function recordSummaryGenerated(): { profile: UserProfile; xpGained: number } {
  const profile = getUserProfile();
  profile.stats.summariesGenerated += 1;
  profile.xp += XP_REWARDS.GENERATE_SUMMARY;
  profile.level = getLevel(profile.xp);
  saveUserProfile(profile);
  
  return { profile, xpGained: XP_REWARDS.GENERATE_SUMMARY };
}

export function getPositions(): UserPosition[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(POSITIONS_KEY);
    if (stored) {
      return JSON.parse(stored) as UserPosition[];
    }
  } catch {
    // Storage not available
  }
  
  return [];
}

export function savePosition(
  procedureId: string,
  procedureTitle: string,
  position: Position,
  reason?: string
): { position: UserPosition; xpGained: number } {
  const positions = getPositions();
  
  const existing = positions.find((p) => p.procedureId === procedureId);
  if (existing) {
    existing.position = position;
    existing.reason = reason;
    existing.timestamp = new Date().toISOString();
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
      } catch {
        // Storage not available
      }
    }
    
    return { position: existing, xpGained: 0 };
  }
  
  const newPosition: UserPosition = {
    id: generateId(),
    procedureId,
    procedureTitle,
    position,
    reason,
    timestamp: new Date().toISOString(),
    actionsTaken: [],
  };
  
  positions.push(newPosition);
  
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
    } catch {
      // Storage not available
    }
  }
  
  const profile = getUserProfile();
  profile.stats.totalPositions += 1;
  profile.xp += XP_REWARDS.STATE_POSITION;
  profile.level = getLevel(profile.xp);
  saveUserProfile(profile);
  
  return { position: newPosition, xpGained: XP_REWARDS.STATE_POSITION };
}

export function getPosition(procedureId: string): UserPosition | null {
  const positions = getPositions();
  return positions.find((p) => p.procedureId === procedureId) || null;
}

export function recordAction(
  procedureId: string,
  actionType: ActionType
): { xpGained: number; profile: UserProfile } {
  const positions = getPositions();
  const position = positions.find((p) => p.procedureId === procedureId);
  
  if (position && !position.actionsTaken.includes(actionType)) {
    position.actionsTaken.push(actionType);
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
      } catch {
        // Storage not available
      }
    }
  }
  
  const xpMap: Record<ActionType, number> = {
    contact_mep: XP_REWARDS.CONTACT_MEP,
    consultation: XP_REWARDS.JOIN_CONSULTATION,
    petition: XP_REWARDS.SIGN_PETITION,
    share: XP_REWARDS.SHARE_PROCEDURE,
  };
  
  const xpGained = xpMap[actionType];
  const profile = getUserProfile();
  
  switch (actionType) {
    case "contact_mep":
      profile.stats.mepsContacted += 1;
      break;
    case "consultation":
      profile.stats.consultationsJoined += 1;
      break;
    case "petition":
      profile.stats.petitionsSigned += 1;
      break;
    case "share":
      profile.stats.proceduresShared += 1;
      break;
  }
  
  profile.xp += xpGained;
  profile.level = getLevel(profile.xp);
  saveUserProfile(profile);
  
  return { xpGained, profile };
}

export function getTotalActions(profile: UserProfile): number {
  return (
    (profile.stats.mepsContacted || 0) +
    (profile.stats.consultationsJoined || 0) +
    (profile.stats.petitionsSigned || 0) +
    (profile.stats.proceduresShared || 0)
  );
}

export function getUniqueActionTypes(profile: UserProfile): number {
  let count = 0;
  if (profile.stats.mepsContacted > 0) count++;
  if (profile.stats.consultationsJoined > 0) count++;
  if (profile.stats.petitionsSigned > 0) count++;
  if (profile.stats.proceduresShared > 0) count++;
  return count;
}

export function unlockAchievement(achievementId: string): { profile: UserProfile; achievement: Achievement | null } {
  const profile = getUserProfile();
  
  if (profile.achievements.includes(achievementId)) {
    return { profile, achievement: null };
  }
  
  const achievementData = ACHIEVEMENTS_LIST.find((a) => a.id === achievementId);
  if (!achievementData) {
    return { profile, achievement: null };
  }
  
  profile.achievements.push(achievementId);
  profile.xp += achievementData.xpReward;
  profile.level = getLevel(profile.xp);
  saveUserProfile(profile);
  
  const achievement: Achievement = {
    ...achievementData,
    unlockedAt: new Date().toISOString(),
  };
  
  return { profile, achievement };
}

export function checkAchievements(): Achievement[] {
  const profile = getUserProfile();
  const unlockedAchievements: Achievement[] = [];
  
  if (!profile.achievements.includes("first-steps") && profile.stats.proceduresViewed >= 1) {
    const { achievement } = unlockAchievement("first-steps");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("curious-mind") && profile.stats.summariesGenerated >= 1) {
    const { achievement } = unlockAchievement("curious-mind");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("first-voice") && profile.stats.totalPositions >= 1) {
    const { achievement } = unlockAchievement("first-voice");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("civic-champion") && profile.stats.mepsContacted >= 1) {
    const { achievement } = unlockAchievement("civic-champion");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("active-citizen") && getUniqueActionTypes(profile) >= 3) {
    const { achievement } = unlockAchievement("active-citizen");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("democracy-defender") && profile.stats.mepsContacted >= 5) {
    const { achievement } = unlockAchievement("democracy-defender");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("consultation-expert") && profile.stats.consultationsJoined >= 5) {
    const { achievement } = unlockAchievement("consultation-expert");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("amplifier") && profile.stats.proceduresShared >= 10) {
    const { achievement } = unlockAchievement("amplifier");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("eu-advocate") && getTotalActions(profile) >= 50) {
    const { achievement } = unlockAchievement("eu-advocate");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("political-scientist") && profile.stats.summariesGenerated >= 10) {
    const { achievement } = unlockAchievement("political-scientist");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("eu-expert") && profile.level >= 10) {
    const { achievement } = unlockAchievement("eu-expert");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  if (!profile.achievements.includes("streak-master") && profile.streak >= 7) {
    const { achievement } = unlockAchievement("streak-master");
    if (achievement) unlockedAchievements.push(achievement);
  }
  
  return unlockedAchievements;
}

export function updateUsername(username: string): UserProfile {
  const profile = getUserProfile();
  profile.username = username;
  saveUserProfile(profile);
  return profile;
}
