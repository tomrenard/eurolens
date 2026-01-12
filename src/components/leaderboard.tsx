"use client";

import { useSyncExternalStore, useCallback, useRef } from "react";
import { Trophy, Medal, Crown, TrendingUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/level-badge";
import { getUserProfile, getTotalActions } from "@/lib/gamification";
import type { LeaderboardEntry, UserProfile } from "@/types/gamification";

const STORAGE_KEY = "eurolens-user-profile";

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "1", username: "EuroAdvocate", xp: 15420, level: 12, totalActions: 87 },
  { rank: 2, userId: "2", username: "BrusselsVoice", xp: 12350, level: 10, totalActions: 68 },
  { rank: 3, userId: "3", username: "PolicyChampion", xp: 9870, level: 9, totalActions: 52 },
  { rank: 4, userId: "4", username: "DemocracyFan", xp: 8240, level: 8, totalActions: 41 },
  { rank: 5, userId: "5", username: "CivicHero2024", xp: 6890, level: 7, totalActions: 35 },
  { rank: 6, userId: "6", username: "ActionTaker", xp: 5430, level: 6, totalActions: 28 },
  { rank: 7, userId: "7", username: "ParliamentNerd", xp: 4120, level: 5, totalActions: 22 },
  { rank: 8, userId: "8", username: "VoiceOfEurope", xp: 3250, level: 4, totalActions: 16 },
  { rank: 9, userId: "9", username: "CivicMinded", xp: 2180, level: 3, totalActions: 11 },
  { rank: 10, userId: "10", username: "NewAdvocate", xp: 980, level: 2, totalActions: 5 },
];

function RankIcon({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
        <Crown className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 flex items-center justify-center">
        <Medal className="h-4 w-4 text-white" />
      </div>
    );
  }
  return (
    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
      <span className="text-sm font-bold text-muted-foreground">{rank}</span>
    </div>
  );
}

interface UserData {
  profile: UserProfile | null;
  rank: number | null;
  totalActions: number;
}

function useUserData(): UserData {
  const cache = useRef<UserData>({ profile: null, rank: null, totalActions: 0 });
  const cacheXp = useRef<number | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return { profile: null, rank: null, totalActions: 0 };
    const profile = getUserProfile();
    if (cacheXp.current !== profile.xp) {
      const rankIndex = MOCK_LEADERBOARD.findIndex((e) => e.xp < profile.xp);
      cache.current = {
        profile,
        rank: rankIndex === -1 ? MOCK_LEADERBOARD.length + 1 : rankIndex + 1,
        totalActions: getTotalActions(profile),
      };
      cacheXp.current = profile.xp;
    }
    return cache.current;
  }, []);

  const getServerSnapshot = useCallback(() => ({ profile: null, rank: null, totalActions: 0 }), []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function Leaderboard() {
  const { profile: userProfile, rank: userRank, totalActions } = useUserData();

  return (
    <div className="space-y-6">
      {userProfile && userRank && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg">{userProfile.username}</p>
                  <p className="text-sm text-muted-foreground">{totalActions} civic actions taken</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">#{userRank}</span>
                </div>
                <p className="text-sm text-muted-foreground">{userProfile.xp.toLocaleString()} XP</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Civic Action Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {MOCK_LEADERBOARD.map((entry, index) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                  index < 3 ? "bg-gradient-to-r from-amber-500/10 to-transparent" : "bg-muted/30"
                }`}
              >
                <RankIcon rank={entry.rank} />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold truncate">{entry.username}</span>
                    <LevelBadge level={entry.level} size="sm" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {entry.totalActions} civic actions
                  </p>
                </div>

                <div className="text-right">
                  <p className="font-bold text-lg">{entry.xp.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
