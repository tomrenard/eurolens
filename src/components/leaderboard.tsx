"use client";

import { useState, useEffect } from "react";
import { Trophy, Medal, Crown, TrendingUp, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/level-badge";
import { getUserProfile, getTotalActions } from "@/lib/gamification";
import type { LeaderboardEntry, UserProfile } from "@/types/gamification";

const FALLBACK_LEADERBOARD: LeaderboardEntry[] = [
  {
    rank: 1,
    userId: "1",
    username: "EuroAdvocate",
    xp: 15420,
    level: 12,
    totalActions: 87,
  },
  {
    rank: 2,
    userId: "2",
    username: "BrusselsVoice",
    xp: 12350,
    level: 10,
    totalActions: 68,
  },
  {
    rank: 3,
    userId: "3",
    username: "PolicyChampion",
    xp: 9870,
    level: 9,
    totalActions: 52,
  },
  {
    rank: 4,
    userId: "4",
    username: "DemocracyFan",
    xp: 8240,
    level: 8,
    totalActions: 41,
  },
  {
    rank: 5,
    userId: "5",
    username: "CivicHero2024",
    xp: 6890,
    level: 7,
    totalActions: 35,
  },
  {
    rank: 6,
    userId: "6",
    username: "ActionTaker",
    xp: 5430,
    level: 6,
    totalActions: 28,
  },
  {
    rank: 7,
    userId: "7",
    username: "ParliamentNerd",
    xp: 4120,
    level: 5,
    totalActions: 22,
  },
  {
    rank: 8,
    userId: "8",
    username: "VoiceOfEurope",
    xp: 3250,
    level: 4,
    totalActions: 16,
  },
  {
    rank: 9,
    userId: "9",
    username: "CivicMinded",
    xp: 2180,
    level: 3,
    totalActions: 11,
  },
  {
    rank: 10,
    userId: "10",
    username: "NewAdvocate",
    xp: 980,
    level: 2,
    totalActions: 5,
  },
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

export function Leaderboard() {
  const [entries, setEntries] =
    useState<LeaderboardEntry[]>(FALLBACK_LEADERBOARD);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      let leaderboardEntries = FALLBACK_LEADERBOARD;
      try {
        const res = await fetch("/api/leaderboard?limit=20");
        if (!cancelled && res.ok) {
          const data = await res.json();
          if (Array.isArray(data.entries) && data.entries.length > 0) {
            leaderboardEntries = data.entries;
            setEntries(data.entries);
          }
        }
      } catch {
        if (!cancelled) setEntries(FALLBACK_LEADERBOARD);
      }
      if (cancelled) return;
      setLoading(false);

      let profile: UserProfile | null = null;
      try {
        const profileRes = await fetch("/api/me/profile");
        if (profileRes.ok) {
          const data = await profileRes.json();
          profile = data.profile ?? null;
        }
      } catch {
        // ignore
      }
      if (!profile && typeof window !== "undefined") {
        profile = getUserProfile();
      }
      if (!cancelled && profile) {
        setUserProfile(profile);
        const rankIdx = leaderboardEntries.findIndex((e) => e.xp < profile!.xp);
        setUserRank(
          rankIdx === -1 ? leaderboardEntries.length + 1 : rankIdx + 1
        );
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalActions = userProfile ? getTotalActions(userProfile) : 0;

  return (
    <div className="space-y-6">
      {userProfile && userRank !== null && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <User className="h-6 w-6 text-white" />
                </div>
                <div>
                  <p className="font-bold text-lg">{userProfile.username}</p>
                  <p className="text-sm text-muted-foreground">
                    {totalActions} civic actions taken
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-2xl font-bold">#{userRank}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {userProfile.xp.toLocaleString()} XP
                </p>
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
          {loading ? (
            <div className="space-y-3">
              {FALLBACK_LEADERBOARD.slice(0, 5).map((_, i) => (
                <div
                  key={i}
                  className="h-14 rounded-lg bg-muted/50 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {entries.map((entry, index) => (
                <div
                  key={entry.userId}
                  className={`flex items-center gap-4 p-3 rounded-lg transition-colors ${
                    index < 3
                      ? "bg-gradient-to-r from-amber-500/10 to-transparent"
                      : "bg-muted/30"
                  } ${
                    userProfile?.id === entry.userId
                      ? "ring-2 ring-primary"
                      : ""
                  }`}
                >
                  <RankIcon rank={entry.rank} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold truncate">
                        {entry.username}
                      </span>
                      <LevelBadge level={entry.level} size="sm" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {entry.totalActions} civic actions
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="font-bold text-lg">
                      {entry.xp.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground">XP</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
