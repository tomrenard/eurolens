export type Position = "support" | "oppose" | "neutral";
export type ActionType = "contact_mep" | "consultation" | "petition" | "share";

export interface UserPosition {
  id: string;
  procedureId: string;
  procedureTitle: string;
  position: Position;
  reason?: string;
  timestamp: string;
  actionsTaken: ActionType[];
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
}

export interface UserStats {
  totalPositions: number;
  mepsContacted: number;
  consultationsJoined: number;
  petitionsSigned: number;
  proceduresShared: number;
  proceduresViewed: number;
}

export interface UserProfile {
  id: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  achievements: string[];
  stats: UserStats;
  createdAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar?: string;
  xp: number;
  level: number;
  totalActions: number;
}

export const LEVEL_THRESHOLDS = [
  0,
  100,
  250,
  500,
  1000,
  2000,
  3500,
  5500,
  8000,
  12000,
  17000,
  25000,
  35000,
  50000,
  75000,
];

export const LEVEL_TITLES: Record<number, string> = {
  1: "Newcomer",
  2: "Observer",
  3: "Citizen",
  4: "Engaged Voter",
  5: "Policy Enthusiast",
  6: "Active Advocate",
  7: "Parliament Watcher",
  8: "EU Insider",
  9: "Legislative Expert",
  10: "Democracy Champion",
  11: "Brussels Veteran",
  12: "Policy Architect",
  13: "Union Visionary",
  14: "EU Commissioner",
  15: "European Legend",
};

export const XP_REWARDS = {
  VIEW_PROCEDURE: 5,
  STATE_POSITION: 10,
  CONTACT_MEP: 50,
  JOIN_CONSULTATION: 40,
  SIGN_PETITION: 30,
  SHARE_PROCEDURE: 15,
  DAILY_STREAK: 20,
  ACHIEVEMENT_UNLOCK: 100,
};

export const ACHIEVEMENTS_LIST: Omit<Achievement, "unlockedAt" | "progress">[] = [
  {
    id: "first-steps",
    name: "First Steps",
    description: "View your first procedure",
    icon: "👀",
    xpReward: 50,
  },
  {
    id: "curious-mind",
    name: "Curious Mind",
    description: "Read your first plain-English explainer",
    icon: "🧠",
    xpReward: 50,
  },
  {
    id: "first-voice",
    name: "First Voice",
    description: "State your position on a procedure",
    icon: "🗣️",
    xpReward: 50,
  },
  {
    id: "civic-champion",
    name: "Civic Champion",
    description: "Contact your first MEP",
    icon: "✉️",
    xpReward: 100,
  },
  {
    id: "active-citizen",
    name: "Active Citizen",
    description: "Take 3 different types of civic action",
    icon: "🌟",
    xpReward: 150,
  },
  {
    id: "democracy-defender",
    name: "Democracy Defender",
    description: "Contact 5 MEPs about different procedures",
    icon: "🛡️",
    xpReward: 300,
    maxProgress: 5,
  },
  {
    id: "consultation-expert",
    name: "Consultation Expert",
    description: "Join 5 public consultations",
    icon: "📋",
    xpReward: 250,
    maxProgress: 5,
  },
  {
    id: "amplifier",
    name: "Amplifier",
    description: "Share 10 procedures to raise awareness",
    icon: "📢",
    xpReward: 200,
    maxProgress: 10,
  },
  {
    id: "eu-advocate",
    name: "EU Advocate",
    description: "Take 50 total civic actions",
    icon: "🏆",
    xpReward: 500,
    maxProgress: 50,
  },
  {
    id: "political-scientist",
    name: "Political Scientist",
    description: "Read 10 plain-English explainers",
    icon: "📚",
    xpReward: 150,
    maxProgress: 10,
  },
  {
    id: "eu-expert",
    name: "EU Expert",
    description: "Reach level 10",
    icon: "⭐",
    xpReward: 500,
  },
  {
    id: "streak-master",
    name: "Streak Master",
    description: "Maintain a 7-day engagement streak",
    icon: "🔥",
    xpReward: 250,
    maxProgress: 7,
  },
];
