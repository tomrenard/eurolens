"use client";

import { useSyncExternalStore, useCallback, useMemo, useRef } from "react";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUserProfile } from "@/lib/gamification";
import { ACHIEVEMENTS_LIST } from "@/types/gamification";

const STORAGE_KEY = "eurolens-user-profile";

function useUnlockedAchievements(): string[] {
  const cache = useRef<string[]>([]);
  const cacheKey = useRef("");

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return [];
    const achievements = getUserProfile().achievements;
    const key = achievements.join(",");
    if (key !== cacheKey.current) {
      cache.current = achievements;
      cacheKey.current = key;
    }
    return cache.current;
  }, []);

  const getServerSnapshot = useCallback(() => [], []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function AchievementsGrid() {
  const unlockedIds = useUnlockedAchievements();

  const achievements = useMemo(() => {
    return ACHIEVEMENTS_LIST.map((achievement) => ({
      ...achievement,
      unlocked: unlockedIds.includes(achievement.id),
      progress: 0,
    }));
  }, [unlockedIds]);

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span>Achievements</span>
          <span className="text-sm font-normal text-muted-foreground">
            {unlockedCount} / {achievements.length}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative p-4 rounded-lg border text-center transition-all ${
                achievement.unlocked
                  ? "bg-gradient-to-br from-primary/10 to-purple-500/10 border-primary/30"
                  : "bg-muted/30 border-muted opacity-60"
              }`}
            >
              <div className="text-3xl mb-2">
                {achievement.unlocked ? (
                  achievement.icon
                ) : (
                  <div className="w-8 h-8 mx-auto rounded-full bg-muted flex items-center justify-center">
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <p className="font-medium text-sm">{achievement.name}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {achievement.description}
              </p>
              {achievement.unlocked && (
                <p className="text-xs text-primary mt-2 font-medium">
                  +{achievement.xpReward} XP
                </p>
              )}
              {!achievement.unlocked && achievement.maxProgress && (
                <div className="mt-2">
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/50 rounded-full"
                      style={{ width: `${((achievement.progress || 0) / achievement.maxProgress) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
