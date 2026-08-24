import type {
  UserProfile,
  UserPosition,
  Position,
  ActionType,
} from "@/types/gamification";
import { EMPTY_STATS } from "@/types/gamification";

/**
 * Guest-mode storage for a civic record.
 *
 * Signed-in users are served from Supabase, which is authoritative. This
 * covers people who have not signed in, and its contents are imported once on
 * first sign-in.
 */

const STORAGE_KEY = "eurolens-user-profile";
const POSITIONS_KEY = "eurolens-positions";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function createDefaultProfile(): UserProfile {
  return {
    id: generateId(),
    username: "EU Citizen",
    stats: { ...EMPTY_STATS },
    createdAt: new Date().toISOString(),
  };
}

/**
 * Reshapes profiles written by earlier versions, which stored xp, level,
 * streak and achievements alongside the stats.
 */
function normalizeProfile(stored: unknown): UserProfile {
  const profile = stored as Partial<UserProfile> & {
    stats?: Record<string, number | undefined>;
  };
  const stats: Record<string, number | undefined> = profile?.stats ?? {};

  return {
    id: typeof profile?.id === "string" ? profile.id : generateId(),
    username:
      typeof profile?.username === "string" ? profile.username : "EU Citizen",
    stats: {
      totalPositions: stats.totalPositions ?? 0,
      mepsContacted: stats.mepsContacted ?? 0,
      consultationsJoined: stats.consultationsJoined ?? 0,
      petitionsSigned: stats.petitionsSigned ?? 0,
      proceduresShared: stats.proceduresShared ?? 0,
    },
    createdAt:
      typeof profile?.createdAt === "string"
        ? profile.createdAt
        : new Date().toISOString(),
  };
}

export function getUserProfile(): UserProfile {
  if (typeof window === "undefined") return createDefaultProfile();

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return normalizeProfile(JSON.parse(stored));
  } catch {
    // Storage unavailable or corrupt; fall through to a fresh profile.
  }

  const profile = createDefaultProfile();
  saveUserProfile(profile);
  return profile;
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Quota exceeded or storage disabled; the server copy still holds.
  }
}

export function getPositions(): UserPosition[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(POSITIONS_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as UserPosition[]) : [];
  } catch {
    return [];
  }
}

function savePositions(positions: UserPosition[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(POSITIONS_KEY, JSON.stringify(positions));
  } catch {
    // Ignore: the server copy is authoritative for signed-in users.
  }
}

export function getPosition(procedureId: string): UserPosition | null {
  return getPositions().find((p) => p.procedureId === procedureId) ?? null;
}

function recountStats(): void {
  const positions = getPositions();
  const profile = getUserProfile();

  const counted = { ...EMPTY_STATS, totalPositions: positions.length };

  for (const position of positions) {
    for (const action of new Set(position.actionsTaken ?? [])) {
      if (action === "contact_mep") counted.mepsContacted++;
      if (action === "consultation") counted.consultationsJoined++;
      if (action === "petition") counted.petitionsSigned++;
      if (action === "share") counted.proceduresShared++;
    }
  }

  saveUserProfile({ ...profile, stats: counted });
}

export function savePosition(
  procedureId: string,
  procedureTitle: string,
  position: Position,
  reason?: string
): UserPosition {
  const positions = getPositions();
  const existing = positions.find((p) => p.procedureId === procedureId);

  const record: UserPosition = existing
    ? { ...existing, position, reason, procedureTitle }
    : {
        id: generateId(),
        procedureId,
        procedureTitle,
        position,
        reason,
        timestamp: new Date().toISOString(),
        actionsTaken: [],
      };

  savePositions([
    record,
    ...positions.filter((p) => p.procedureId !== procedureId),
  ]);
  recountStats();

  return record;
}

export function recordAction(
  procedureId: string,
  action: ActionType
): void {
  const positions = getPositions();
  const existing = positions.find((p) => p.procedureId === procedureId);

  if (!existing) return;
  if (existing.actionsTaken?.includes(action)) return;

  savePositions(
    positions.map((p) =>
      p.procedureId === procedureId
        ? { ...p, actionsTaken: [...(p.actionsTaken ?? []), action] }
        : p
    )
  );
  recountStats();
}
