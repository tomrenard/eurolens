"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { FileText, Mail, ClipboardList, Share2, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthButton } from "@/components/auth-button";
import { useAuth } from "@/components/auth-context";
import { getUserProfile } from "@/lib/gamification";
import { totalActions } from "@/lib/scoring";
import type { UserProfile as UserProfileType } from "@/types/gamification";

const STORAGE_KEY = "eurolens-user-profile";

function useLocalProfile(): UserProfileType | null {
  const subscribe = useCallback((onStoreChange: () => void) => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) onStoreChange();
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const getSnapshot = useCallback(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY);
  }, []);

  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);
  if (raw === null) return null;

  try {
    return getUserProfile();
  } catch {
    return null;
  }
}

function useCivicRecord(): UserProfileType | null {
  const localProfile = useLocalProfile();
  const { user } = useAuth();
  const [fetched, setFetched] = useState<{
    userId: string;
    profile: UserProfileType | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    fetch("/api/me/profile")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) {
          setFetched({ userId: user.id, profile: data.profile ?? null });
        }
      })
      .catch(() => {
        if (!cancelled) setFetched({ userId: user.id, profile: null });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Matching on user id keeps a previous account's record from showing after a
  // switch; the local copy covers guests and the moment before the fetch lands.
  const remote = user && fetched?.userId === user.id ? fetched.profile : null;
  return remote ?? localProfile;
}

const ENTRIES = [
  { key: "totalPositions", label: "Positions taken", icon: PenLine },
  { key: "mepsContacted", label: "MEPs contacted", icon: Mail },
  { key: "consultationsJoined", label: "Consultations", icon: ClipboardList },
  { key: "petitionsSigned", label: "Petitions", icon: FileText },
  { key: "proceduresShared", label: "Shared", icon: Share2 },
] as const;

interface UserProfileProps {
  compact?: boolean;
}

/**
 * A private record of what the reader has done.
 *
 * This replaced an XP/level/streak display backed by a public leaderboard.
 * Ranking citizens against each other by political activity reads as partisan
 * however carefully it is worded, so the numbers are now a personal tally and
 * are shown only to the person they belong to.
 */
export function UserProfile({ compact = false }: UserProfileProps) {
  const profile = useCivicRecord();
  const { user, isLoading } = useAuth();

  if (!profile) return null;

  const actions = totalActions(profile.stats);

  if (compact) {
    if (profile.stats.totalPositions === 0 && actions === 0) return null;

    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span>
          <span className="font-semibold text-foreground">
            {profile.stats.totalPositions}
          </span>{" "}
          positions
        </span>
        <span aria-hidden="true">·</span>
        <span>
          <span className="font-semibold text-foreground">{actions}</span>{" "}
          actions
        </span>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Your civic record</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ENTRIES.map(({ key, label, icon: Icon }) => (
            <div key={key} className="space-y-0.5">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {label}
              </dt>
              <dd className="text-2xl font-semibold tabular-nums">
                {profile.stats[key]}
              </dd>
            </div>
          ))}
        </dl>

        {!isLoading && !user && (
          <div className="border-t pt-3 space-y-2">
            <p className="text-xs text-muted-foreground">
              This record is stored in this browser only. Sign in to keep it.
            </p>
            <AuthButton />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
