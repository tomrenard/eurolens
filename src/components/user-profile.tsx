"use client";

import {
  useState,
  useEffect,
  useSyncExternalStore,
  useRef,
  useCallback,
} from "react";
import { User, Flame, Trophy, MessageSquare, Mail, Share2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AuthButton } from "@/components/auth-button";
import { XpBar } from "@/components/xp-bar";
import { LevelBadge } from "@/components/level-badge";
import {
  getUserProfile,
  getLevelTitle,
  getTotalActions,
} from "@/lib/gamification";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile as UserProfileType } from "@/types/gamification";

const STORAGE_KEY = "eurolens-user-profile";

function useLocalProfile(): UserProfileType | null {
  const cache = useRef<UserProfileType | null>(null);

  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return null;
    const profile = getUserProfile();
    if (
      !cache.current ||
      cache.current.xp !== profile.xp ||
      cache.current.level !== profile.level
    ) {
      cache.current = profile;
    }
    return cache.current;
  }, []);

  const getServerSnapshot = useCallback(() => null, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function useUserProfile(): UserProfileType | null {
  const localProfile = useLocalProfile();
  const [apiProfile, setApiProfile] = useState<
    UserProfileType | null | undefined
  >(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setApiProfile(null);
        return;
      }
      fetch("/api/me/profile")
        .then((res) => res.json())
        .then((data) => setApiProfile(data.profile ?? null))
        .catch(() => setApiProfile(null));
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setApiProfile(null);
        return;
      }
      fetch("/api/me/profile")
        .then((res) => res.json())
        .then((data) => setApiProfile(data.profile ?? null))
        .catch(() => setApiProfile(null));
    });
    return () => subscription.unsubscribe();
  }, []);

  if (apiProfile !== undefined && apiProfile !== null) return apiProfile;
  return localProfile;
}

interface UserProfileProps {
  compact?: boolean;
}

export function UserProfile({ compact = false }: UserProfileProps) {
  const profile = useUserProfile();
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session?.user);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (compact) {
    if (!profile) return null;
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/10">
        <LevelBadge level={profile.level} size="sm" />
        <div className="flex-1 min-w-0">
          <XpBar
            xp={profile.xp}
            level={profile.level}
            showLabel={false}
            size="sm"
          />
        </div>
        {profile.streak > 0 && (
          <div className="flex items-center gap-1 text-orange-500">
            <Flame className="h-4 w-4" />
            <span className="text-xs font-bold">{profile.streak}</span>
          </div>
        )}
      </div>
    );
  }

  if (hasSession === false) {
    return (
      <Card className="h-full overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground mb-3">
            Sign in to save your progress and appear on the leaderboard.
          </p>
          <AuthButton />
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs font-medium text-muted-foreground mb-3">
              When you sign in you&apos;ll see:
            </p>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-foreground">—</p>
                <p className="text-[10px] text-muted-foreground">Positions</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                  <Mail className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-foreground">—</p>
                <p className="text-[10px] text-muted-foreground">MEPs</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
                  <Share2 className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-foreground">—</p>
                <p className="text-[10px] text-muted-foreground">Actions</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
                  <Trophy className="h-4 w-4" />
                </div>
                <p className="text-lg font-bold text-foreground">—</p>
                <p className="text-[10px] text-muted-foreground">Badges</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!profile) {
    return null;
  }

  const totalActions = getTotalActions(profile);

  return (
    <Card className="h-full overflow-hidden border border-primary/20 bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5">
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center ring-4 ring-primary/20">
              <User className="h-8 w-8 text-white" />
            </div>
            <div className="absolute -bottom-1 -right-1">
              <LevelBadge level={profile.level} size="sm" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-bold text-foreground truncate">
                {profile.username}
              </h3>
              {profile.streak >= 3 && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400">
                  <Flame className="h-3 w-3" />
                  <span className="text-xs font-bold">
                    {profile.streak} day streak
                  </span>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              {getLevelTitle(profile.level)}
            </p>
            <XpBar xp={profile.xp} level={profile.level} />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mt-6 pt-4 border-t border-border">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-purple-500 mb-1">
              <MessageSquare className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {profile.stats.totalPositions}
            </p>
            <p className="text-[10px] text-muted-foreground">Positions</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
              <Mail className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {profile.stats.mepsContacted}
            </p>
            <p className="text-[10px] text-muted-foreground">MEPs</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-500 mb-1">
              <Share2 className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-foreground">{totalActions}</p>
            <p className="text-[10px] text-muted-foreground">Actions</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-amber-500 mb-1">
              <Trophy className="h-4 w-4" />
            </div>
            <p className="text-lg font-bold text-foreground">
              {profile.achievements.length}
            </p>
            <p className="text-[10px] text-muted-foreground">Badges</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
